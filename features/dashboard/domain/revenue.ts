/**
 * The platform revenue ledger — the one answer to "where does Otithee make
 * money?".
 *
 * Design decision worth knowing before you change anything here: revenue is
 * **half derived, half stored**, and that is deliberate.
 *
 *   Derived  — anything already implied by a booking or a refund: commission,
 *              service fees, the insurance margin, cancellation fees and
 *              platform-funded discounts. These are recomputed from the booking
 *              ledger on every read, so the Revenue Center can never disagree
 *              with the Commission page or a merchant's settlement. Storing them
 *              would create a second copy of the same fact.
 *   Stored   — anything with no booking behind it: membership subscriptions,
 *              advertising billing, B2B subscription fees and manual
 *              adjustments. These are written once, by the service that caused
 *              them, through {@link recordRevenue}.
 *
 * Everything, derived or stored, comes back as the same {@link RevenueEntry}
 * shape, so filtering, grouping, charting and CSV export are written once.
 *
 * The three pots stay separate throughout: `grossValue` is what changed hands,
 * `partnerShare` is the merchant's/provider's/agency's, and only `amount` is
 * the platform's. Tax never appears here at all — it belongs to the tax
 * authority and is reported by the tax module.
 */

import { money } from "./money";
import { getState, mutate, nextId, nextReference } from "./store";
import type {
  Booking,
  BookingSegment,
  BookingStatus,
  ProductKind,
  Refund,
} from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export const REVENUE_SOURCES = [
  "booking_commission",
  "service_fee",
  "insurance",
  "membership",
  "advertising",
  "b2b_margin",
  "b2b_subscription",
  "cancellation_fee",
  "promotional_subsidy",
  "adjustment",
] as const;

export type RevenueSource = (typeof REVENUE_SOURCES)[number];

export const SOURCE_LABELS: Record<RevenueSource, string> = {
  booking_commission: "Booking commission",
  service_fee: "Service fee",
  insurance: "Insurance",
  membership: "Membership",
  advertising: "Advertising",
  b2b_margin: "B2B margin",
  b2b_subscription: "B2B subscription",
  cancellation_fee: "Cancellation & amendment fees",
  promotional_subsidy: "Promotional subsidy",
  adjustment: "Adjustment",
};

/** Sources that reduce platform revenue rather than adding to it. */
export const CONTRA_SOURCES: readonly RevenueSource[] = ["promotional_subsidy"];

/** Sources the ledger derives from bookings/refunds rather than storing. */
export const DERIVED_SOURCES: readonly RevenueSource[] = [
  "booking_commission",
  "b2b_margin",
  "service_fee",
  "insurance",
  "cancellation_fee",
  "promotional_subsidy",
];

/**
 * `accrued`   — earned but not yet realised (booking confirmed, not delivered)
 * `finalized` — the booking completed / the money was collected
 * `reversed`  — fully given back (refund, campaign credit)
 * `adjusted`  — partially reversed, or edited by an operator
 */
export type RevenueStatus = "accrued" | "finalized" | "reversed" | "adjusted";

export const REVENUE_STATUS_LABELS: Record<RevenueStatus, string> = {
  accrued: "Accrued",
  finalized: "Finalized",
  reversed: "Reversed",
  adjusted: "Adjusted",
};

export interface RevenueEntry {
  id: string;
  reference: string;
  at: string;
  source: RevenueSource;
  status: RevenueStatus;
  currency: string;
  label: string;
  /** What the customer paid for the thing this entry is about. */
  grossValue: number;
  /** The merchant's / provider's / agency's share of `grossValue`. */
  partnerShare: number;
  /** The platform's share, gross of reversals. Negative for contra sources. */
  amount: number;
  /** How much of `amount` has been given back. */
  reversed: number;
  /** `amount - reversed` — the figure that rolls up. */
  net: number;

  // --- references, all optional; used for filtering and drill-down ---------
  bookingId?: string;
  bookingRef?: string;
  bookingStatus?: BookingStatus;
  merchantId?: string;
  merchantName?: string;
  organizationId?: string;
  organizationName?: string;
  customerEmail?: string;
  customerName?: string;
  campaignId?: string;
  advertiserId?: string;
  /** Insurance plan or membership plan id. */
  planId?: string;
  providerId?: string;
  productKind?: ProductKind;
  segment?: BookingSegment;
  destination?: string;
  note?: string;
}

/** Everything a Revenue Center filter can narrow on. */
export interface RevenueFilters {
  /** Inclusive ISO date (or datetime). */
  from?: string;
  /** Inclusive ISO date (or datetime). */
  to?: string;
  source?: RevenueSource | "";
  productKind?: ProductKind | "";
  merchantId?: string;
  organizationId?: string;
  customerEmail?: string;
  destination?: string;
  segment?: BookingSegment | "";
  bookingStatus?: BookingStatus | "";
  currency?: string;
  status?: RevenueStatus | "";
  /** Free-text over label / references. */
  search?: string;
}

// ---------------------------------------------------------------------------
// Derivation
// ---------------------------------------------------------------------------

/**
 * The refunded share of a booking, 0–1.
 *
 * Commission is reversed strictly proportionally by `quoteRefund`, so the ratio
 * of reversed to original commission *is* the refund percentage — no second
 * definition of "how much was given back" is needed.
 */
function refundShareOf(booking: Booking): number {
  const m = booking.money;
  if (m.commission > 0) return Math.min(1, m.commissionReversed / m.commission);
  const collected = m.netSale + m.taxes + m.fees + (m.insurance ?? 0);
  return collected > 0 ? Math.min(1, m.refunded / collected) : 0;
}

function statusFor(booking: Booking, share: number): RevenueStatus {
  if (share >= 1) return "reversed";
  if (share > 0) return "adjusted";
  if (booking.status === "completed") return "finalized";
  return "accrued";
}

function refFor(booking: Booking, suffix: string): string {
  return `REV-${booking.reference}-${suffix}`;
}

/** The revenue lines one booking implies. Pure; nothing is written. */
export function entriesForBooking(booking: Booking): RevenueEntry[] {
  const m = booking.money;
  // A failed booking was never delivered and never earned anything.
  if (booking.status === "failed") return [];

  const share = refundShareOf(booking);
  const status = statusFor(booking, share);
  const base = {
    at: booking.createdAt,
    status,
    currency: m.currency,
    bookingId: booking.id,
    bookingRef: booking.reference,
    bookingStatus: booking.status,
    merchantId: booking.merchant.id,
    merchantName: booking.merchant.name,
    organizationId: booking.customer.organizationId,
    organizationName: booking.customer.organizationName,
    customerEmail: booking.customer.email,
    customerName: booking.customer.name,
    productKind: booking.productKind,
    segment: booking.segment,
    destination: booking.destination,
  };
  const rows: RevenueEntry[] = [];

  // --- commission (B2B commission is reported as B2B margin) --------------
  if (m.commission > 0) {
    rows.push({
      ...base,
      id: `${booking.id}:commission`,
      reference: refFor(booking, "CMN"),
      source: booking.segment === "b2b" ? "b2b_margin" : "booking_commission",
      label: `${booking.money.commissionRate}% commission · ${booking.productTitle}`,
      // The whole transaction, so a row reads "customer paid X, merchant got Y,
      // platform kept Z" — and so GBV sums correctly across the ledger.
      grossValue: m.total,
      partnerShare: m.merchantEarning,
      amount: m.commission,
      reversed: m.commissionReversed,
      net: money(m.commission - m.commissionReversed),
      note: booking.segment === "b2b" ? "Agency booking — platform margin." : undefined,
    });
  }

  // --- service fee --------------------------------------------------------
  if (m.fees > 0) {
    const reversed = money(m.fees * share);
    rows.push({
      ...base,
      id: `${booking.id}:fee`,
      reference: refFor(booking, "FEE"),
      source: "service_fee",
      label: `Service fee · ${booking.reference}`,
      grossValue: m.fees,
      partnerShare: 0,
      amount: m.fees,
      reversed,
      net: money(m.fees - reversed),
    });
  }

  // --- insurance margin ---------------------------------------------------
  if ((m.insurance ?? 0) > 0) {
    rows.push({
      ...base,
      id: `${booking.id}:insurance`,
      reference: refFor(booking, "INS"),
      source: "insurance",
      label: `Insurance commission · ${booking.reference}`,
      grossValue: m.insurance,
      partnerShare: m.insuranceProviderShare,
      amount: m.insuranceRevenue,
      reversed: m.insuranceRevenueReversed ?? 0,
      net: money(m.insuranceRevenue - (m.insuranceRevenueReversed ?? 0)),
    });
  }

  // --- cancellation administration fee ------------------------------------
  // Only the platform's share of the fee: the rest stays with the merchant,
  // and the commission it kept is already on the commission line above.
  if ((m.platformCancellationFee ?? 0) > 0) {
    rows.push({
      ...base,
      id: `${booking.id}:cxlfee`,
      reference: refFor(booking, "CXL"),
      source: "cancellation_fee",
      status: "finalized",
      label: `Cancellation administration fee · ${booking.reference}`,
      grossValue: m.platformCancellationFee,
      partnerShare: 0,
      amount: m.platformCancellationFee,
      reversed: 0,
      net: m.platformCancellationFee,
    });
  }

  // --- platform-funded discount (contra) ----------------------------------
  if ((m.platformFundedDiscount ?? 0) > 0) {
    rows.push({
      ...base,
      id: `${booking.id}:subsidy`,
      reference: refFor(booking, "SUB"),
      source: "promotional_subsidy",
      label: `Platform-funded discount · ${booking.reference}`,
      grossValue: m.platformFundedDiscount,
      partnerShare: m.platformFundedDiscount,
      amount: -m.platformFundedDiscount,
      reversed: 0,
      net: -m.platformFundedDiscount,
    });
  }

  return rows;
}

/**
 * Cancellation administration fees on refunds the booking has not yet absorbed
 * — i.e. an approved refund whose booking is still walking to `refunded`.
 *
 * Once the booking settles the fee onto `money.platformCancellationFee`, the
 * booking-derived entry above takes over, so the two never both count it.
 */
export function entriesForRefund(refund: Refund, booking?: Booking): RevenueEntry[] {
  const fee = refund.platformCancellationFee ?? 0;
  if (fee <= 0) return [];
  if (refund.status === "rejected" || refund.status === "failed") return [];
  // Already folded into the booking's money — nothing more to recognise.
  if ((booking?.money.platformCancellationFee ?? 0) > 0) return [];
  return [
    {
      id: `${refund.id}:fee`,
      reference: `REV-${refund.reference}`,
      at: refund.processedAt ?? refund.requestedAt,
      source: "cancellation_fee",
      status: refund.status === "completed" ? "finalized" : "accrued",
      currency: refund.currency,
      label: `Cancellation administration fee · ${refund.bookingRef}`,
      grossValue: fee,
      partnerShare: 0,
      amount: fee,
      reversed: 0,
      net: fee,
      bookingId: refund.bookingId,
      bookingRef: refund.bookingRef,
      bookingStatus: booking?.status,
      merchantId: refund.merchant.id,
      merchantName: refund.merchant.name,
      organizationId: refund.customer.organizationId,
      organizationName: refund.customer.organizationName,
      customerEmail: refund.customer.email,
      customerName: refund.customer.name,
      productKind: booking?.productKind,
      segment: refund.segment,
      destination: booking?.destination,
    },
  ];
}

// ---------------------------------------------------------------------------
// Stored entries
// ---------------------------------------------------------------------------

export type RecordRevenueInput = Omit<
  RevenueEntry,
  "id" | "reference" | "net" | "reversed"
> & { reversed?: number };

/**
 * Write a revenue entry for something no booking implies — a membership sale,
 * an advertising bill, a B2B subscription fee, an operator adjustment.
 *
 * Never call this for booking commission, service fees or insurance: those are
 * derived, and a stored copy would double-count them.
 */
export function recordRevenue(input: RecordRevenueInput): RevenueEntry {
  if (DERIVED_SOURCES.includes(input.source)) {
    throw new Error(
      `${input.source} revenue is derived from bookings — it must not be stored.`,
    );
  }
  const reversed = input.reversed ?? 0;
  const entry: RevenueEntry = {
    ...input,
    id: nextId("rev"),
    reference: nextReference("REV", 81_000),
    reversed,
    net: money(input.amount - reversed),
  };
  mutate((draft) => draft.revenueEntries.unshift(entry));
  return entry;
}

/** Give back part or all of a stored entry — a membership refund, an ad credit. */
export function reverseRevenue(
  id: string,
  amount?: number,
  note?: string,
): RevenueEntry | undefined {
  return mutate((draft) => {
    const row = draft.revenueEntries.find((e) => e.id === id);
    if (!row) return undefined;
    const applied = money(Math.min(amount ?? row.amount, row.amount - row.reversed));
    row.reversed = money(row.reversed + applied);
    row.net = money(row.amount - row.reversed);
    row.status = row.reversed >= row.amount ? "reversed" : "adjusted";
    if (note) row.note = note;
    return structuredClone(row);
  });
}

/** Stored entries pointing at one thing — used to reverse a membership refund. */
export function storedEntriesFor(
  match: Partial<Pick<RevenueEntry, "planId" | "campaignId" | "organizationId" | "customerEmail">>,
): RevenueEntry[] {
  return getState().revenueEntries.filter((e) =>
    Object.entries(match).every(([key, value]) =>
      value === undefined ? true : e[key as keyof RevenueEntry] === value,
    ),
  );
}

// ---------------------------------------------------------------------------
// The ledger
// ---------------------------------------------------------------------------

/** Row-level scoping, mirroring `DomainScope` without importing services. */
export interface RevenueScope {
  merchantId?: string;
  organizationId?: string;
}

function inRevenueScope(entry: RevenueEntry, scope: RevenueScope): boolean {
  if (scope.merchantId && entry.merchantId !== scope.merchantId) return false;
  if (scope.organizationId && entry.organizationId !== scope.organizationId) return false;
  return true;
}

function matchesFilters(entry: RevenueEntry, f: RevenueFilters): boolean {
  if (f.from && entry.at < f.from) return false;
  // `to` is treated as inclusive of the whole day when a bare date is given.
  if (f.to) {
    const bound = f.to.length <= 10 ? `${f.to}T23:59:59.999Z` : f.to;
    if (entry.at > bound) return false;
  }
  if (f.source && entry.source !== f.source) return false;
  if (f.productKind && entry.productKind !== f.productKind) return false;
  if (f.merchantId && entry.merchantId !== f.merchantId) return false;
  if (f.organizationId && entry.organizationId !== f.organizationId) return false;
  if (
    f.customerEmail &&
    entry.customerEmail?.toLowerCase() !== f.customerEmail.toLowerCase()
  ) {
    return false;
  }
  if (f.destination && entry.destination !== f.destination) return false;
  if (f.segment && entry.segment !== f.segment) return false;
  if (f.bookingStatus && entry.bookingStatus !== f.bookingStatus) return false;
  if (f.currency && entry.currency !== f.currency) return false;
  if (f.status && entry.status !== f.status) return false;
  if (f.search) {
    const needle = f.search.toLowerCase();
    const hay = [
      entry.label,
      entry.reference,
      entry.bookingRef,
      entry.merchantName,
      entry.organizationName,
      entry.customerName,
      entry.customerEmail,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!hay.includes(needle)) return false;
  }
  return true;
}

/**
 * Every revenue line the platform has, derived and stored, newest first.
 *
 * This is the only function that composes the two halves — everything else
 * (summary, breakdown, reports, CSV export) reads from what this returns.
 */
export function revenueLedger(
  filters: RevenueFilters = {},
  scope: RevenueScope = {},
): RevenueEntry[] {
  const state = getState();
  const bookingById = new Map(state.bookings.map((b) => [b.id, b]));

  const derived: RevenueEntry[] = [];
  for (const booking of state.bookings) derived.push(...entriesForBooking(booking));
  for (const refund of state.refunds) {
    derived.push(...entriesForRefund(refund, bookingById.get(refund.bookingId)));
  }

  return [...derived, ...state.revenueEntries]
    .filter((e) => inRevenueScope(e, scope) && matchesFilters(e, filters))
    .sort((a, b) => b.at.localeCompare(a.at));
}

export interface RevenueSourceTotal {
  source: RevenueSource;
  label: string;
  gross: number;
  reversed: number;
  net: number;
  count: number;
  /** Share of gross platform revenue, 0–1. Contra sources report 0. */
  share: number;
}

export interface RevenueSummary {
  currency: string;
  /** Gross booking value — what customers paid, merchant share included. */
  gmv: number;
  /** Platform revenue from sources with no booking behind them. */
  nonBookingRevenue: number;
  /** What merchants/providers/agencies earned. Never platform revenue. */
  partnerRevenue: number;
  /** Platform revenue before reversals and subsidies. */
  grossPlatformRevenue: number;
  /** Refunds, commission reversals and campaign credits. */
  reversals: number;
  /** Platform-funded promotional discounts. */
  subsidies: number;
  /** `gross − reversals − subsidies` — the bottom line. */
  netPlatformRevenue: number;
  /** Net platform revenue ÷ GMV, as a percentage. */
  takeRate: number;
  entryCount: number;
  bySource: RevenueSourceTotal[];
}

/** Totals for a set of ledger entries. */
export function summarizeRevenue(
  entries: RevenueEntry[],
  currency = "USD",
): RevenueSummary {
  const totals = new Map<RevenueSource, RevenueSourceTotal>();
  let gmv = 0;
  let partnerRevenue = 0;
  let gross = 0;
  let reversals = 0;
  let subsidies = 0;

  for (const entry of entries) {
    const contra = CONTRA_SOURCES.includes(entry.source);
    const row = totals.get(entry.source) ?? {
      source: entry.source,
      label: SOURCE_LABELS[entry.source],
      gross: 0,
      reversed: 0,
      net: 0,
      count: 0,
      share: 0,
    };
    row.gross = money(row.gross + entry.amount);
    row.reversed = money(row.reversed + entry.reversed);
    row.net = money(row.net + entry.net);
    row.count += 1;
    totals.set(entry.source, row);

    partnerRevenue = money(partnerRevenue + entry.partnerShare);
    reversals = money(reversals + entry.reversed);
    if (contra) {
      subsidies = money(subsidies + Math.abs(entry.amount));
    } else {
      gross = money(gross + entry.amount);
      // Gross booking value is counted once per booking, on the commission
      // line: the fee, insurance and cancellation lines are components of the
      // same transaction, and membership/advertising are not bookings at all.
      if (entry.source === "booking_commission" || entry.source === "b2b_margin") {
        gmv = money(gmv + entry.grossValue);
      }
    }
  }

  const netPlatformRevenue = money(gross - reversals - subsidies);
  const nonBookingRevenue = money(
    [...totals.values()]
      .filter((row) => !DERIVED_SOURCES.includes(row.source))
      .reduce((n, row) => n + row.net, 0),
  );
  const bySource = [...totals.values()]
    .map((row) => ({
      ...row,
      share: gross > 0 && !CONTRA_SOURCES.includes(row.source) ? row.net / gross : 0,
    }))
    .sort((a, b) => b.net - a.net);

  return {
    currency,
    gmv,
    nonBookingRevenue,
    partnerRevenue,
    grossPlatformRevenue: gross,
    reversals,
    subsidies,
    netPlatformRevenue,
    takeRate: gmv > 0 ? money((netPlatformRevenue / gmv) * 100) : 0,
    entryCount: entries.length,
    bySource,
  };
}

export interface RevenueGroup {
  key: string;
  label: string;
  net: number;
  gross: number;
  count: number;
}

/** Group ledger entries for a chart or a drill-down table. */
export function groupRevenue(
  entries: RevenueEntry[],
  keyOf: (entry: RevenueEntry) => string | undefined,
  labelOf: (entry: RevenueEntry) => string = (e) => keyOf(e) ?? "—",
): RevenueGroup[] {
  const map = new Map<string, RevenueGroup>();
  for (const entry of entries) {
    const key = keyOf(entry);
    if (!key) continue;
    const row = map.get(key) ?? {
      key,
      label: labelOf(entry),
      net: 0,
      gross: 0,
      count: 0,
    };
    row.net = money(row.net + entry.net);
    row.gross = money(row.gross + entry.amount);
    row.count += 1;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.net - a.net);
}

/** Monthly trend, oldest first — the Revenue Center's headline chart. */
export function revenueByMonth(entries: RevenueEntry[]): RevenueGroup[] {
  return groupRevenue(entries, (e) => e.at.slice(0, 7)).sort((a, b) =>
    a.key.localeCompare(b.key),
  );
}

/**
 * A monthly matrix of net revenue per source — the stacked view that makes the
 * revenue mix legible over time.
 */
export function revenueMixByMonth(
  entries: RevenueEntry[],
): { month: string; total: number; bySource: Record<string, number> }[] {
  const months = new Map<string, { total: number; bySource: Record<string, number> }>();
  for (const entry of entries) {
    const key = entry.at.slice(0, 7);
    const row = months.get(key) ?? { total: 0, bySource: {} };
    row.bySource[entry.source] = money((row.bySource[entry.source] ?? 0) + entry.net);
    row.total = money(row.total + entry.net);
    months.set(key, row);
  }
  return [...months.entries()]
    .map(([month, row]) => ({ month, ...row }))
    .sort((a, b) => a.month.localeCompare(b.month));
}
