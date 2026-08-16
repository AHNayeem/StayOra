/**
 * The tax engine — configurable rules that actually price a booking.
 *
 * Before this file the platform had two unrelated halves: an admin screen that
 * managed a list of tax rules, and a money engine that charged one flat
 * `taxRate` from platform configuration. Editing a rule changed nothing a
 * customer paid. This module is the join:
 *
 *   rule book (here)  →  assessTax(context)  →  tax lines  →  priceBooking
 *
 * A rule matches on jurisdiction, product category and an effective window, and
 * charges on one of five bases — so a percentage VAT, a per-night city levy and
 * a tax on the platform's service fee can all coexist on the same booking and
 * be shown to the traveller as separate lines.
 *
 * Two deliberate behaviours:
 *
 * - **Nothing matches → the flat rate still applies.** `PRICING_CONFIG.taxRate`
 *   remains the fallback, so a destination with no rule book behaves exactly as
 *   it did before and no existing figure moves.
 * - **Inclusive rules don't add to the total.** A tax-inclusive price already
 *   contains the tax; the line is carved *out* of the net sale for display and
 *   reporting rather than added on top, which is what "included in price"
 *   means to the traveller and to the authority.
 *
 * Lines are snapshotted onto `Booking.money.taxLines` at creation, so a rate
 * change tomorrow never rewrites what was charged yesterday — and a refund
 * reverses the tax that was actually collected.
 *
 * ## Why the rule book is not in the domain store
 * The same reason `platform-config.ts` isn't: `money.ts` reads it, and the
 * domain store's seed *calls* `money.ts`. Routing it through the store would
 * make that a module cycle with a top-level read on the wrong side. So the rule
 * book owns a small persisted store of its own, with the same localStorage
 * discipline and SSR-safe hydration. Audit entries are written one layer up, in
 * `tax-service.ts`, which may safely import both.
 */

import { pricingConfig } from "./platform-config";
import type { ProductKind } from "./types";

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

export const TAX_STATUS_VALUES = ["active", "inactive"] as const;
export type TaxStatus = (typeof TAX_STATUS_VALUES)[number];

export const TAX_TYPE_VALUES = ["exclusive", "inclusive"] as const;
export type TaxType = (typeof TAX_TYPE_VALUES)[number];

/**
 * What the charge is measured against. The first two are percentage bases; the
 * last three are fixed amounts multiplied by a count off the booking.
 */
export const TAX_BASIS_VALUES = [
  "net_sale",
  "service_fee",
  "per_night",
  "per_guest_night",
  "per_booking",
] as const;
export type TaxBasis = (typeof TAX_BASIS_VALUES)[number];

export const TAX_BASIS_LABELS: Record<TaxBasis, string> = {
  net_sale: "% of net sale",
  service_fee: "% of service fee",
  per_night: "Fixed, per unit per night",
  per_guest_night: "Fixed, per guest per night",
  per_booking: "Fixed, per booking",
};

/** Bases that read `rate` (a percentage); the rest read `amount`. */
export function isPercentageBasis(basis: TaxBasis): boolean {
  return basis === "net_sale" || basis === "service_fee";
}

export const TAX_CATEGORY_VALUES = [
  "Accommodation",
  "Transport",
  "Tours & Activities",
  "Visa & documentation",
  "Service fee",
  "All bookings",
] as const;
export type TaxCategory = (typeof TAX_CATEGORY_VALUES)[number];

/** Which product kinds a category covers. `All bookings` covers everything. */
const CATEGORY_PRODUCTS: Record<TaxCategory, ProductKind[] | "all"> = {
  Accommodation: ["hotels", "resorts", "apartments", "shared-rooms", "convention-hall"],
  Transport: ["transport", "flights"],
  "Tours & Activities": ["tours", "activities"],
  "Visa & documentation": ["visa"],
  "Service fee": "all",
  "All bookings": "all",
};

/**
 * Jurisdictions a rule can be written for — a closed catalogue, so a rule can
 * never point at a destination the catalogue doesn't sell. `GLOBAL` matches
 * everything; `EU` matches any member state.
 */
export const TAX_JURISDICTIONS: { code: string; label: string }[] = [
  { code: "GLOBAL", label: "Global — every destination" },
  { code: "EU", label: "European Union" },
  { code: "AE", label: "United Arab Emirates" },
  { code: "AT", label: "Austria" },
  { code: "AU", label: "Australia" },
  { code: "BD", label: "Bangladesh" },
  { code: "CH", label: "Switzerland" },
  { code: "CL", label: "Chile" },
  { code: "EG", label: "Egypt" },
  { code: "ES", label: "Spain" },
  { code: "FR", label: "France" },
  { code: "GB", label: "United Kingdom" },
  { code: "GR", label: "Greece" },
  { code: "HR", label: "Croatia" },
  { code: "ID", label: "Indonesia" },
  { code: "IN", label: "India" },
  { code: "IT", label: "Italy" },
  { code: "JP", label: "Japan" },
  { code: "KE", label: "Kenya" },
  { code: "KR", label: "South Korea" },
  { code: "LK", label: "Sri Lanka" },
  { code: "MA", label: "Morocco" },
  { code: "MV", label: "Maldives" },
  { code: "MY", label: "Malaysia" },
  { code: "NL", label: "Netherlands" },
  { code: "PT", label: "Portugal" },
  { code: "QA", label: "Qatar" },
  { code: "SG", label: "Singapore" },
  { code: "TH", label: "Thailand" },
  { code: "TR", label: "Türkiye" },
  { code: "US", label: "United States" },
  { code: "VN", label: "Vietnam" },
  { code: "ZA", label: "South Africa" },
];

const JURISDICTION_LABELS: Record<string, string> = Object.fromEntries(
  TAX_JURISDICTIONS.map((j) => [j.code, j.label]),
);

const EU_MEMBERS = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE",
]);

/** Human label for a jurisdiction code, falling back to the code itself. */
export function jurisdictionLabel(code: string): string {
  return JURISDICTION_LABELS[code] ?? code;
}

/**
 * Country name → ISO-2, for the listings whose `location` carries a name but no
 * code. Only the destinations the catalogue actually sells need an entry.
 */
const COUNTRY_CODES: Record<string, string> = {
  "united arab emirates": "AE",
  uae: "AE",
  austria: "AT",
  australia: "AU",
  bangladesh: "BD",
  switzerland: "CH",
  chile: "CL",
  croatia: "HR",
  egypt: "EG",
  spain: "ES",
  france: "FR",
  "united kingdom": "GB",
  uk: "GB",
  greece: "GR",
  indonesia: "ID",
  india: "IN",
  italy: "IT",
  japan: "JP",
  kenya: "KE",
  "south korea": "KR",
  "sri lanka": "LK",
  morocco: "MA",
  maldives: "MV",
  malaysia: "MY",
  netherlands: "NL",
  portugal: "PT",
  qatar: "QA",
  singapore: "SG",
  thailand: "TH",
  "türkiye": "TR",
  turkiye: "TR",
  turkey: "TR",
  "united states": "US",
  usa: "US",
  us: "US",
  vietnam: "VN",
  "south africa": "ZA",
};

/** Best-effort ISO-2 for a destination, from a code or a country name. */
export function toCountryCode(
  countryCode?: string,
  countryName?: string,
): string | undefined {
  if (countryCode && countryCode.length === 2) return countryCode.toUpperCase();
  const name = countryName?.trim().toLowerCase();
  return name ? COUNTRY_CODES[name] : undefined;
}

// ---------------------------------------------------------------------------
// The rule
// ---------------------------------------------------------------------------

export interface TaxRule {
  id: string;
  name: string;
  /** Jurisdiction code from {@link TAX_JURISDICTIONS}. */
  region: string;
  category: TaxCategory;
  basis: TaxBasis;
  /** Percentage 0–100. Read only by percentage bases. */
  rate: number;
  /** Fixed charge in base currency. Read only by fixed bases. */
  amount: number;
  type: TaxType;
  /** Lower runs first; ties break on id. Purely presentational ordering. */
  priority: number;
  status: TaxStatus;
  /** ISO date the rule starts applying (empty = always). */
  effectiveFrom?: string;
  /** ISO date the rule stops applying (empty = open-ended). */
  effectiveTo?: string;
  updatedAt: string;
}

export interface TaxRuleInput {
  name: string;
  region: string;
  category: TaxCategory;
  basis: TaxBasis;
  rate: number;
  amount: number;
  type: TaxType;
  priority: number;
  status: TaxStatus;
  effectiveFrom?: string;
  effectiveTo?: string;
}

function isoAt(dayOffset: number): string {
  return new Date(Date.UTC(2026, 6, 1) - dayOffset * 86_400_000).toISOString();
}

type Seed = Omit<TaxRule, "id" | "updatedAt">;

const SEEDS: Seed[] = [
  {
    name: "UK VAT",
    region: "GB",
    category: "All bookings",
    basis: "net_sale",
    rate: 20,
    amount: 0,
    type: "inclusive",
    priority: 10,
    status: "active",
  },
  {
    name: "EU VAT (standard)",
    region: "EU",
    category: "Accommodation",
    basis: "net_sale",
    rate: 21,
    amount: 0,
    type: "inclusive",
    priority: 10,
    status: "active",
  },
  {
    name: "UAE VAT",
    region: "AE",
    category: "All bookings",
    basis: "net_sale",
    rate: 5,
    amount: 0,
    type: "exclusive",
    priority: 10,
    status: "active",
  },
  {
    name: "UAE tourism dirham",
    region: "AE",
    category: "Accommodation",
    basis: "per_night",
    rate: 0,
    amount: 5.5,
    type: "exclusive",
    priority: 20,
    status: "active",
  },
  {
    name: "US sales tax (average)",
    region: "US",
    category: "All bookings",
    basis: "net_sale",
    rate: 8.5,
    amount: 0,
    type: "exclusive",
    priority: 10,
    status: "active",
  },
  {
    name: "France city tourism levy",
    region: "FR",
    category: "Accommodation",
    basis: "per_guest_night",
    rate: 0,
    amount: 2.6,
    type: "exclusive",
    priority: 20,
    status: "active",
  },
  {
    name: "Singapore GST",
    region: "SG",
    category: "All bookings",
    basis: "net_sale",
    rate: 9,
    amount: 0,
    type: "inclusive",
    priority: 10,
    status: "active",
  },
  {
    name: "Spain activities levy",
    region: "ES",
    category: "Tours & Activities",
    basis: "net_sale",
    rate: 10,
    amount: 0,
    type: "exclusive",
    priority: 15,
    status: "active",
  },
  {
    name: "Thailand VAT",
    region: "TH",
    category: "All bookings",
    basis: "net_sale",
    rate: 7,
    amount: 0,
    type: "exclusive",
    priority: 10,
    status: "active",
  },
  {
    name: "Platform service tax",
    region: "GLOBAL",
    category: "Service fee",
    basis: "service_fee",
    rate: 2,
    amount: 0,
    type: "exclusive",
    priority: 30,
    status: "inactive",
  },
  {
    name: "UK transport service tax",
    region: "GB",
    category: "Transport",
    basis: "net_sale",
    rate: 12,
    amount: 0,
    type: "exclusive",
    priority: 15,
    status: "inactive",
  },
];

/** The shipped rule book. */
export function seedTaxRules(): TaxRule[] {
  return SEEDS.map((seed, index) => ({
    ...seed,
    id: `tax_${200 + index}`,
    updatedAt: isoAt(index * 5),
  }));
}

// ---------------------------------------------------------------------------
// Store — persisted like the platform configuration, and for the same reason
// ---------------------------------------------------------------------------

const STORAGE_KEY = "otithee:tax-rules:v1";
const EVENT = "otithee:tax-rules-change";

let current: TaxRule[] | null = null;
let hydrated = false;
let sequence = 0;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function hydrate(): TaxRule[] {
  if (!isBrowser()) return seedTaxRules();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedTaxRules();
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as TaxRule[]) : seedTaxRules();
  } catch {
    return seedTaxRules();
  }
}

/** The active rule book. Reads the shipped seed on the server. */
export function taxRules(): TaxRule[] {
  if (!current || (!hydrated && isBrowser())) {
    current = hydrate();
    hydrated = isBrowser();
  }
  return current;
}

/** Replace the rule book and persist it. */
export function commitTaxRules(next: TaxRule[]): TaxRule[] {
  current = next;
  hydrated = true;
  if (isBrowser()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* quota or private mode — the change still applies for this session */
    }
    window.dispatchEvent(new Event(EVENT));
  }
  return next;
}

/** Restore the shipped rule book (Settings → "Reset demo data"). */
export function resetTaxRules(): TaxRule[] {
  return commitTaxRules(seedTaxRules());
}

/** A fresh rule id, unique within the session. */
export function nextTaxRuleId(): string {
  sequence += 1;
  return `tax_${900 + sequence}`;
}

export function subscribeTaxRules(listener: () => void): () => void {
  if (!isBrowser()) return () => {};
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

// ---------------------------------------------------------------------------
// Assessment
// ---------------------------------------------------------------------------

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** One resolved charge, stored on the booking and rendered at checkout. */
export interface TaxLine {
  ruleId: string;
  name: string;
  basis: TaxBasis;
  type: TaxType;
  /** Percentage, for percentage bases. */
  rate?: number;
  /** What this line costs, in the booking's currency. */
  amount: number;
  /** How a fixed charge was multiplied, e.g. "2 guests × 3 nights". */
  detail?: string;
}

export interface TaxContext {
  productKind: ProductKind;
  /** ISO-2 of the destination. Unknown ⇒ only `GLOBAL` rules can match. */
  countryCode?: string;
  /** Sale value after discounts — the base for percentage rules. */
  netSale: number;
  /** Platform service fee — the base for `service_fee` rules. */
  fees: number;
  nights: number;
  units: number;
  guests: number;
  /** Evaluation date (ISO). Defaults to now. */
  at?: string;
}

export interface TaxAssessment {
  lines: TaxLine[];
  /** Charged on top of the sale — this is what `BookingMoney.taxes` becomes. */
  exclusiveTotal: number;
  /** Already inside the price; shown as "includes …", never added. */
  inclusiveTotal: number;
  /** `exclusiveTotal / netSale`, for display next to the tax row. */
  effectiveRate: number;
  /** False when nothing matched and the flat platform rate was used. */
  matched: boolean;
}

function appliesTo(rule: TaxRule, kind: ProductKind): boolean {
  const products = CATEGORY_PRODUCTS[rule.category];
  return products === "all" || products.includes(kind);
}

function inJurisdiction(rule: TaxRule, countryCode?: string): boolean {
  if (rule.region === "GLOBAL") return true;
  if (!countryCode) return false;
  if (rule.region === "EU") return EU_MEMBERS.has(countryCode);
  return rule.region === countryCode;
}

function inWindow(rule: TaxRule, atMs: number): boolean {
  if (rule.effectiveFrom && new Date(rule.effectiveFrom).getTime() > atMs) return false;
  if (rule.effectiveTo && new Date(rule.effectiveTo).getTime() < atMs) return false;
  return true;
}

/** Rules that would apply to a context, in the order they are charged. */
export function matchingTaxRules(context: TaxContext, rules = taxRules()): TaxRule[] {
  const atMs = new Date(context.at ?? new Date().toISOString()).getTime();
  return rules
    .filter(
      (rule) =>
        rule.status === "active" &&
        inWindow(rule, atMs) &&
        inJurisdiction(rule, context.countryCode) &&
        appliesTo(rule, context.productKind),
    )
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
}

function chargeFor(rule: TaxRule, context: TaxContext): { amount: number; detail?: string } {
  const nights = Math.max(1, context.nights);
  const units = Math.max(1, context.units);
  const guests = Math.max(1, context.guests);

  switch (rule.basis) {
    case "net_sale":
      return { amount: round(context.netSale * (rule.rate / 100)) };
    case "service_fee":
      return { amount: round(context.fees * (rule.rate / 100)) };
    case "per_night":
      return {
        amount: round(rule.amount * nights * units),
        detail: `${units} × ${nights} night${nights === 1 ? "" : "s"}`,
      };
    case "per_guest_night":
      return {
        amount: round(rule.amount * nights * guests),
        detail: `${guests} guest${guests === 1 ? "" : "s"} × ${nights} night${nights === 1 ? "" : "s"}`,
      };
    case "per_booking":
      return { amount: round(rule.amount) };
    default:
      return { amount: 0 };
  }
}

/**
 * Price the tax on one sale. Pure — it reads the rule book but writes nothing,
 * so checkout can call it on every keystroke.
 */
export function assessTax(context: TaxContext, rules = taxRules()): TaxAssessment {
  const matched = matchingTaxRules(context, rules);

  const lines: TaxLine[] = matched
    .map((rule) => {
      const { amount, detail } = chargeFor(rule, context);
      return {
        ruleId: rule.id,
        name: rule.name,
        basis: rule.basis,
        type: rule.type,
        rate: isPercentageBasis(rule.basis) ? rule.rate : undefined,
        amount,
        detail,
      } satisfies TaxLine;
    })
    .filter((line) => line.amount > 0);

  if (lines.length === 0) {
    // No rule book for this destination — the platform's flat rate still
    // applies, so every figure that existed before this engine is unchanged.
    const flat = round(context.netSale * pricingConfig().taxRate);
    return {
      lines: flat
        ? [
            {
              ruleId: "platform_default",
              name: "Tax",
              basis: "net_sale",
              type: "exclusive",
              rate: round(pricingConfig().taxRate * 100),
              amount: flat,
            },
          ]
        : [],
      exclusiveTotal: flat,
      inclusiveTotal: 0,
      effectiveRate: context.netSale > 0 ? flat / context.netSale : 0,
      matched: false,
    };
  }

  const exclusiveTotal = round(
    lines.filter((l) => l.type === "exclusive").reduce((sum, l) => sum + l.amount, 0),
  );
  const inclusiveTotal = round(
    lines.filter((l) => l.type === "inclusive").reduce((sum, l) => sum + l.amount, 0),
  );

  return {
    lines,
    exclusiveTotal,
    inclusiveTotal,
    effectiveRate: context.netSale > 0 ? exclusiveTotal / context.netSale : 0,
    matched: true,
  };
}

/**
 * Reverse the tax on a refunded share of a booking. Every line moves by the
 * same proportion as the sale, which is what keeps a partial refund's tax
 * reversal reconcilable line by line.
 */
export function reverseTaxLines(lines: TaxLine[] | undefined, percent: number): TaxLine[] {
  if (!lines?.length || percent <= 0) return [];
  const share = Math.min(1, percent);
  return lines.map((line) => ({ ...line, amount: round(line.amount * share) }));
}
