/**
 * promotions.ts — the storefront read-model for offers and combo bundles.
 *
 * Offers and bundles are authored in the dashboard (Promotions → Offers /
 * Combos) and stored in the domain, so what a visitor sees on the home page is
 * the same record an admin edits and the one `evaluateOffer` later measures a
 * basket against. This module only ever *reads*: it filters the domain down to
 * what is genuinely live right now and shapes it for display.
 *
 * Two deliberate constraints:
 *
 *  1. **No maths of its own.** Savings come from {@link comboTotals} and
 *     availability from {@link comboAvailability} — the same functions that
 *     price a bundle at checkout. Re-deriving them here is how a storefront
 *     ends up advertising a discount the basket refuses to honour.
 *  2. **Amounts stay in base USD.** Formatting happens in the components, via
 *     the locale's `money()`, so the currency switcher reprices these bands
 *     like every other price on the site.
 *
 * The selectors are synchronous and pure, which is what lets a section read
 * them through `useDomainValue` — server-rendered from the seed, then live on
 * the client the moment the dashboard changes something.
 */

import {
  PLATFORM_NOW,
  comboAvailability,
  comboTotals,
  getState,
  type ComboOffer,
  type CustomerEligibility,
  type DiscountType,
  type Offer,
} from "@/features/dashboard/domain";
import type { BookingVertical } from "@/types/booking";
import type { ComboSuggestion } from "@/types/trip";
import { VERTICALS } from "@/constants/verticals";

const DAY_MS = 86_400_000;

/** Whole days from `at` until `iso`, floored at 0. */
function daysUntil(iso: string, at: string): number {
  return Math.max(
    0,
    Math.ceil((new Date(iso).getTime() - new Date(at).getTime()) / DAY_MS),
  );
}

/* -------------------------------------------------------------------------- */
/* Offers                                                                      */
/* -------------------------------------------------------------------------- */

/** Eligibility labels for the storefront — `all` needs no chip at all. */
const ELIGIBILITY_LABEL: Partial<Record<CustomerEligibility, string>> = {
  new: "New customers",
  returning: "Returning customers",
  member: "Members only",
};

/** A live offer, shaped for a promotional card. Amounts are base USD. */
export interface StorefrontOffer {
  id: string;
  name: string;
  description: string;
  discountType: DiscountType;
  /** Percent (0–100) or a fixed base-USD amount, per `discountType`. */
  value: number;
  promoCode?: string;
  endAt: string;
  /** Whole days left; 0 = ends today. */
  endsInDays: number;
  minBookingAmount: number;
  /** Verticals it applies to; empty means everything. */
  products: BookingVertical[];
  /** e.g. "Hotels, Resorts & Apartments" or "Everything". */
  appliesTo: string;
  destinations: string[];
  /** Present only when the offer is narrower than "everyone". */
  eligibilityLabel?: string;
  /** Set for merchant-scoped offers, so the card can credit the seller. */
  merchantName?: string;
  /** Redemptions left when the offer is capped. */
  remaining?: number;
  terms: string;
  /** Where the CTA goes — the vertical it applies to, narrowed by destination. */
  href: string;
}

/** "Hotels, Resorts & Apartments" — the products an offer covers, in words. */
function appliesToLabel(products: BookingVertical[]): string {
  if (products.length === 0) return "Everything";
  const labels = products.map((p) => VERTICALS[p]?.labelPlural ?? p);
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(", ")} & ${labels[labels.length - 1]}`;
}

/**
 * Where an offer card sends the traveller.
 *
 * A single-vertical offer goes straight to that listing route; anything wider
 * (or destination-scoped) goes to search, which can express both at once.
 */
function offerHref(products: BookingVertical[], destinations: string[]): string {
  const [destination] = destinations;
  const [vertical] = products;
  const single = products.length === 1 && Boolean(VERTICALS[vertical]);

  if (destination) {
    const params = new URLSearchParams({ q: destination });
    if (single) params.set("type", vertical);
    return `/search?${params.toString()}`;
  }
  return single ? VERTICALS[vertical].href : "/search";
}

/** Is this offer live and promotable to a walk-up visitor? */
function offerIsLive(offer: Offer, at: string): boolean {
  const now = new Date(at).getTime();
  return (
    offer.status === "active" &&
    offer.offerType !== "combo" &&
    // B2B rates belong in the partner portal, not on the consumer home page.
    offer.eligibility !== "b2b" &&
    now >= new Date(offer.startAt).getTime() &&
    now <= new Date(offer.endAt).getTime() &&
    (offer.usageLimit === 0 || offer.used < offer.usageLimit)
  );
}

function toStorefrontOffer(offer: Offer, at: string): StorefrontOffer {
  const products = offer.products.filter(
    (p): p is BookingVertical => p !== "combo",
  );

  return {
    id: offer.id,
    name: offer.name,
    description: offer.description,
    discountType: offer.discountType,
    value: offer.value,
    promoCode: offer.promoCode,
    endAt: offer.endAt,
    endsInDays: daysUntil(offer.endAt, at),
    minBookingAmount: offer.minBookingAmount,
    products,
    appliesTo: appliesToLabel(products),
    destinations: offer.destinations,
    eligibilityLabel: ELIGIBILITY_LABEL[offer.eligibility],
    merchantName: offer.scope === "merchant" ? offer.merchantName : undefined,
    remaining:
      offer.usageLimit > 0 ? Math.max(0, offer.usageLimit - offer.used) : undefined,
    terms: offer.terms,
    href: offerHref(products, offer.destinations),
  };
}

/**
 * The offers running right now, most urgent first.
 *
 * "Urgent" is the honest ordering for a promotions band: whatever closes
 * soonest leads, and equally-dated offers are ranked by how much they actually
 * take off (a percentage is weighted against a nominal $500 basket so the two
 * discount types are comparable).
 */
export function liveOffers({
  limit,
  at = PLATFORM_NOW,
}: { limit?: number; at?: string } = {}): StorefrontOffer[] {
  const rows = getState()
    .offers.filter((offer) => offerIsLive(offer, at))
    .map((offer) => toStorefrontOffer(offer, at));

  const weight = (o: StorefrontOffer) =>
    o.discountType === "percent" ? (o.value / 100) * 500 : o.value;

  rows.sort((a, b) => a.endsInDays - b.endsInDays || weight(b) - weight(a));
  return limit ? rows.slice(0, limit) : rows;
}

/* -------------------------------------------------------------------------- */
/* Combo bundles                                                               */
/* -------------------------------------------------------------------------- */

/**
 * A domain bundle as the trip layer wants it.
 *
 * Shared by the home page band and the cart's bundle suggestions so a combo is
 * described — and priced — in exactly one place. `matchedKinds` is how many of
 * the bundle's kinds the trip already covers; a visitor arriving from the home
 * page has covered none.
 */
export function comboSuggestion(combo: ComboOffer, matchedKinds = 0): ComboSuggestion {
  const totals = comboTotals(combo);
  return {
    comboId: combo.id,
    name: combo.name,
    description: combo.description,
    destination: combo.destination,
    separatelyUsd: totals.individualTotal,
    comboPrice: combo.comboPrice,
    savingsUsd: totals.savings,
    items: combo.items.map((item) => ({
      id: item.id,
      kind: item.kind as BookingVertical,
      title: item.title,
      detail: item.detail,
      merchantId: item.merchantId,
      merchantName: item.merchantName,
      priceUsd: item.price,
    })),
    matchedKinds,
    terms: combo.terms,
  };
}

/** A bookable bundle, shaped for a combo card. Amounts are base USD. */
export interface StorefrontCombo {
  id: string;
  name: string;
  slug: string;
  description: string;
  destination: string;
  /** The bundled components, each keeping its own merchant. */
  items: ComboSuggestion["items"];
  comboPrice: number;
  /** What the same components cost booked separately. */
  individualTotal: number;
  savings: number;
  savingsPercent: number;
  /** Packages left, from the domain's own inventory count. */
  seatsLeft: number;
  inventory: number;
  sold: number;
  validTo: string;
  endsInDays: number;
  terms: string;
  /** Ready to hand to the trip layer's `applyCombo`. */
  suggestion: ComboSuggestion;
}

/**
 * The bundles a visitor can book today, biggest saving first.
 *
 * Availability is the domain's call — status, validity window and remaining
 * inventory all come from {@link comboAvailability}, so a bundle that has sold
 * out in the dashboard disappears from the home page on the next render.
 */
export function comboDeals({
  limit,
  at = PLATFORM_NOW,
}: { limit?: number; at?: string } = {}): StorefrontCombo[] {
  const rows = getState()
    .combos.filter((combo) => comboAvailability(combo, at).bookable)
    .map((combo) => {
      const totals = comboTotals(combo);
      const suggestion = comboSuggestion(combo);
      return {
        id: combo.id,
        name: combo.name,
        slug: combo.slug,
        description: combo.description,
        destination: combo.destination,
        items: suggestion.items,
        comboPrice: totals.comboPrice,
        individualTotal: totals.individualTotal,
        savings: totals.savings,
        savingsPercent: Math.round(totals.savingsPercent),
        seatsLeft: totals.available,
        inventory: combo.inventory,
        sold: combo.sold,
        validTo: combo.validTo,
        endsInDays: daysUntil(combo.validTo, at),
        terms: combo.terms,
        suggestion,
      };
    });

  rows.sort((a, b) => b.savings - a.savings);
  return limit ? rows.slice(0, limit) : rows;
}
