/**
 * recommendation.ts — the contextual travel recommendation seam.
 *
 * Given a {@link TripContext} (where, when, who) and what the traveller has
 * already chosen, this returns the products that genuinely belong to *that*
 * trip: hotels in the destination city, an airport transfer at the arrival
 * airport, activities that fit inside the dates. Nothing here is random — the
 * rules are deterministic and readable, and they run over the same catalog the
 * listing pages read, through {@link "@/services/catalog"}'s data source.
 *
 * The shape of this module is the point: `getRecommendations` is one async call
 * that takes a context and returns ranked groups. Replacing the rule engine
 * below with a `/recommendations` API (or an AI ranker) is a body swap — no UI
 * changes, because the UI only ever sees {@link RecommendationGroup}.
 */

import type { BookingVertical, ListingVertical } from "@/types/booking";
import type { Listing } from "@/types/catalog";
import type {
  ComboSuggestion,
  RecommendationGroup,
  RecommendationMatch,
  RecommendedProduct,
  TripContext,
  TripItem,
} from "@/types/trip";
import { travelerCount } from "@/types/trip";
import {
  ACTIVITIES,
  APARTMENTS,
  HOTELS,
  RESORTS,
  SHARED_ROOMS,
  TOURS,
  TRANSPORT,
  VISAS,
} from "@/constants/listings";
import { VERTICALS, listingHref } from "@/constants/verticals";
import { COMBOS_SEED } from "@/features/dashboard/domain/seed";
import { comboTotals } from "@/features/dashboard/domain/money";
import { durationBetween } from "@/lib/booking-pricing";
import { mockDelay } from "./http";

/* -------------------------------------------------------------------------- */
/* Category rules                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Which categories to offer, in priority order, given what anchored the trip.
 *
 * This is the "don't show random products" rule made explicit: a flight implies
 * somewhere to sleep and a way in from the airport; a hotel implies how to get
 * there and what to do once you have; a tour implies a bed and a transfer. The
 * lists are short on purpose — a rail of nine categories is noise.
 */
const CATEGORY_RULES: Record<BookingVertical, ListingVertical[]> = {
  flights: ["hotels", "apartments", "transport", "activities", "tours", "visa"],
  hotels: ["transport", "activities", "tours"],
  apartments: ["transport", "activities", "tours"],
  resorts: ["transport", "activities", "tours"],
  "shared-rooms": ["transport", "activities", "tours"],
  "convention-hall": ["hotels", "transport", "activities"],
  tours: ["hotels", "transport", "activities"],
  activities: ["hotels", "transport", "tours"],
  transport: ["hotels", "activities", "tours"],
  visa: ["hotels", "transport", "activities", "tours"],
};

/** Fallback order when nothing anchors the trip yet. */
const DEFAULT_CATEGORIES: ListingVertical[] = [
  "hotels",
  "apartments",
  "transport",
  "activities",
  "tours",
];

/** Stay categories are interchangeable — one booked stay satisfies them all. */
const STAY_CATEGORIES: ListingVertical[] = [
  "hotels",
  "apartments",
  "resorts",
  "shared-rooms",
];

/** Categories a traveller can sensibly book more than one of. */
const REPEATABLE: ListingVertical[] = ["activities", "tours", "transport"];

/**
 * Categories that must match the destination or not appear at all. A hotel one
 * country over is a reasonable fallback; a visa for a different country is not.
 */
const DESTINATION_ONLY: ListingVertical[] = ["visa", "transport"];

/** Lucide icon per category, resolved at render by the rail. */
const CATEGORY_ICON: Record<ListingVertical, string> = {
  hotels: "BedDouble",
  apartments: "Building2",
  resorts: "Palmtree",
  "shared-rooms": "Users",
  "convention-hall": "Landmark",
  transport: "BusFront",
  tours: "Map",
  activities: "Ticket",
  visa: "StickyNote",
};

/** The catalog, keyed the same way the catalog service keys it. */
const BY_VERTICAL: Record<ListingVertical, Listing[]> = {
  hotels: HOTELS,
  apartments: APARTMENTS,
  resorts: RESORTS,
  "shared-rooms": SHARED_ROOMS,
  "convention-hall": [],
  transport: TRANSPORT,
  tours: TOURS,
  activities: ACTIVITIES,
  visa: VISAS,
};

/* -------------------------------------------------------------------------- */
/* Matching helpers                                                            */
/* -------------------------------------------------------------------------- */

function norm(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/** How closely a listing sits to the trip's destination. */
function matchLevel(listing: Listing, city: string, country: string): RecommendationMatch | null {
  // A visa is a service for a *country*, and its listing carries no city — so
  // it matches on the country it's issued for and on nothing else. Falling back
  // to "popular" here would offer a Brazil visa for a Dubai trip.
  if (listing.vertical === "visa") {
    return country && norm(listing.country) === norm(country) ? "country" : null;
  }

  const listingCity = norm(listing.location.city);
  const listingCountry = norm(listing.location.country);
  const label = norm(listing.location.label);
  const target = norm(city);

  if (target && (listingCity === target || label.includes(target))) return "destination";
  if (country && listingCountry === norm(country)) return "country";
  return null;
}

/** Max people a listing can take, where its vertical models capacity. */
function capacityOf(listing: Listing): number | undefined {
  switch (listing.vertical) {
    case "apartments":
      return listing.guests;
    case "shared-rooms":
      return listing.bedsAvailable;
    case "transport":
      return listing.seats;
    case "tours":
      return listing.groupSize;
    case "convention-hall":
      return listing.capacity;
    default:
      return undefined;
  }
}

/** How many days a listing occupies, where it has a duration. */
function durationDaysOf(listing: Listing): number | undefined {
  if (listing.vertical === "tours") return listing.durationDays;
  if (listing.vertical === "activities") return 1;
  return undefined;
}

/** True when this transport listing is an airport transfer rather than a coach. */
function isAirportTransfer(listing: Listing): boolean {
  if (listing.vertical !== "transport") return false;
  const route = `${listing.route?.from ?? ""} ${listing.route?.to ?? ""}`.toLowerCase();
  return (
    route.includes("airport") ||
    listing.title.toLowerCase().includes("transfer") ||
    listing.transportType.toLowerCase().includes("private car")
  );
}

/** Human "why you're seeing this" line for a card. */
function reasonFor(
  listing: Listing,
  match: RecommendationMatch,
  context: TripContext,
): string {
  const city = context.destination?.city ?? listing.location.city ?? "your destination";
  switch (listing.vertical) {
    case "transport":
      return isAirportTransfer(listing)
        ? `Airport transfer in ${city}`
        : `Getting around ${city}`;
    case "visa":
      return `Required for ${listing.location.label}`;
    case "activities":
    case "tours":
      return match === "destination" ? `Popular in ${city}` : `Near ${city}`;
    default:
      return match === "destination"
        ? `In ${city}`
        : match === "country"
          ? `Near ${city}`
          : `Popular with travellers to ${city}`;
  }
}

/* -------------------------------------------------------------------------- */
/* Scoring                                                                     */
/* -------------------------------------------------------------------------- */

interface ScoreInput {
  listing: Listing;
  match: RecommendationMatch;
  context: TripContext;
  people: number;
  nights: number;
  /** Remaining budget for this category, or 0 when no budget was set. */
  budgetPerCategory: number;
}

/**
 * Rank one candidate. Relevance to the *destination* dominates everything else;
 * capacity, budget fit and rating only break ties. A product that can't take
 * the party at all is filtered out before it gets here.
 */
function score({ listing, match, context, people, nights, budgetPerCategory }: ScoreInput): number {
  let value = match === "destination" ? 100 : match === "country" ? 45 : 12;

  value += (listing.rating ?? 4) * 4;
  if (listing.featured) value += 6;
  if (listing.badges?.length) value += 2;

  // Airport transfers lead the transport rail for flight-anchored trips.
  if (isAirportTransfer(listing)) {
    value += context.seededBy === "flights" ? 30 : 14;
  }

  // Budget fit: reward products the traveller can actually afford.
  if (budgetPerCategory > 0) {
    const cost = listing.price.amount * (listing.price.unit?.includes("night") ? nights : 1);
    if (cost <= budgetPerCategory) value += 12;
    else if (cost > budgetPerCategory * 1.5) value -= 25;
  }

  // Right-sized capacity beats a 120-seat coach for two travellers.
  const capacity = capacityOf(listing);
  if (capacity !== undefined) {
    if (capacity >= people && capacity <= people * 3) value += 8;
    else if (capacity >= people) value += 3;
  }

  // Purpose nudges, deliberately small.
  if (context.purpose === "family" && (capacity ?? 0) >= people + 2) value += 4;
  if (context.purpose === "business" && listing.vertical === "hotels") value += 4;
  if (context.purpose === "honeymoon" && listing.vertical === "resorts") value += 6;

  return value;
}

/* -------------------------------------------------------------------------- */
/* The engine                                                                  */
/* -------------------------------------------------------------------------- */

export interface RecommendationOptions {
  /** Products already in the trip — never recommended again. */
  items?: TripItem[];
  /** Cap the number of categories returned. */
  maxGroups?: number;
  /** Cap the number of products per category. */
  perGroup?: number;
  /** Force a category order instead of deriving it from the trip. */
  categories?: ListingVertical[];
}

/** Trip length in nights, or 1 when the dates aren't known yet. */
function tripNights(context: TripContext): number {
  const nights = durationBetween(context.departureDate ?? "", context.returnDate ?? "");
  return nights > 0 ? nights : 1;
}

/**
 * Candidates for one category, filtered for relevance and ranked.
 *
 * The three-tier fallback (city → country → popular) is what keeps a rail from
 * ever rendering empty: a trip to a city with no tours in the catalog still
 * gets the country's tours, clearly labelled as such.
 */
function candidatesFor(
  vertical: ListingVertical,
  context: TripContext,
  options: { excludeIds: Set<string>; people: number; nights: number; budget: number; limit: number },
): RecommendedProduct[] {
  const city = context.destination?.city ?? "";
  const country = context.destination?.country ?? "";
  const pool = BY_VERTICAL[vertical];
  if (pool.length === 0) return [];

  const scored: { product: RecommendedProduct; value: number }[] = [];

  for (const listing of pool) {
    if (options.excludeIds.has(listing.id)) continue;

    const capacity = capacityOf(listing);
    // Never suggest something that physically can't take the party.
    if (capacity !== undefined && capacity < options.people) continue;

    // Never suggest something that can't finish inside the trip.
    const days = durationDaysOf(listing);
    if (days !== undefined && context.returnDate && days > options.nights) continue;

    const match = matchLevel(listing, city, country) ?? (city ? null : "popular");
    if (!match) continue;

    scored.push({
      value: score({
        listing,
        match,
        context,
        people: options.people,
        nights: options.nights,
        budgetPerCategory: options.budget,
      }),
      product: {
        id: listing.id,
        kind: vertical,
        slug: listing.slug,
        title: listing.title,
        image: listing.image,
        location: listing.location.label,
        priceUsd: listing.price.amount,
        priceUnit: listing.price.unit ?? VERTICALS[vertical].priceUnit,
        rating: listing.rating,
        reviewCount: listing.reviewCount,
        badge: listing.badges?.[0],
        href: listingHref(listing),
        reason: reasonFor(listing, match, context),
        match,
        capacity,
        durationDays: days,
      },
    });
  }

  // Verticals whose whole value is being *for* the destination get no generic
  // fallback: a visa for the wrong country is worse than no suggestion.
  if (scored.length === 0 && DESTINATION_ONLY.includes(vertical)) return [];

  // No city or country match at all — fall back to the vertical's best-rated,
  // labelled honestly as "popular" rather than pretending it's local.
  if (scored.length === 0) {
    return [...pool]
      .filter((l) => !options.excludeIds.has(l.id))
      .sort((a, z) => (z.rating ?? 0) - (a.rating ?? 0))
      .slice(0, options.limit)
      .map((listing) => ({
        id: listing.id,
        kind: vertical,
        slug: listing.slug,
        title: listing.title,
        image: listing.image,
        location: listing.location.label,
        priceUsd: listing.price.amount,
        priceUnit: listing.price.unit ?? VERTICALS[vertical].priceUnit,
        rating: listing.rating,
        reviewCount: listing.reviewCount,
        badge: listing.badges?.[0],
        href: listingHref(listing),
        reason: reasonFor(listing, "popular", context),
        match: "popular" as const,
        capacity: capacityOf(listing),
        durationDays: durationDaysOf(listing),
      }));
  }

  return scored
    .sort((a, z) => z.value - a.value)
    .slice(0, options.limit)
    .map((s) => s.product);
}

/** Title + subtitle for a category rail, e.g. "Hotels in Dubai · From $65". */
function groupCopy(
  vertical: ListingVertical,
  context: TripContext,
  items: RecommendedProduct[],
): { title: string; subtitle: string; reason: string } {
  const city = context.destination?.city;
  const config = VERTICALS[vertical];
  const from = items.length > 0 ? Math.min(...items.map((i) => i.priceUsd)) : 0;
  const unit = items[0]?.priceUnit ?? config.priceUnit;

  // "in Dubai" is a promise. Only make it when something actually is.
  const inCity = items.some((i) => i.match === "destination");
  const near = city ? (inCity ? `in ${city}` : `near ${city}`) : "";

  if (vertical === "transport") {
    return {
      title: city ? `Airport transfers & transport ${near}` : "Transport",
      subtitle: `From $${from} ${unit}`,
      reason:
        context.seededBy === "flights"
          ? "You'll need a way in from the airport"
          : "Getting around during your stay",
    };
  }
  if (vertical === "visa") {
    return {
      title: `Visa services for ${context.destination?.country ?? "your destination"}`,
      subtitle: `From $${from} per person`,
      reason: "Your passport country may need a visa for this trip",
    };
  }
  return {
    title: city ? `${config.labelPlural} ${near}` : config.labelPlural,
    subtitle: `From $${from} ${unit}`,
    reason: city
      ? inCity
        ? `Matched to your trip to ${city}`
        : `Nothing in ${city} itself — these are the closest options`
      : "Matched to your trip",
  };
}

/**
 * Contextual recommendations for a trip.
 *
 * Categories are chosen from what anchored the trip, then filtered against what
 * is already in it: a booked stay removes the stay rails, a booked transfer
 * removes transport, and every product already added is excluded by id.
 */
export function getRecommendations(
  context: TripContext,
  options: RecommendationOptions = {},
): Promise<RecommendationGroup[]> {
  const { items = [], maxGroups = 4, perGroup = 6 } = options;

  const anchor = items[items.length - 1]?.kind ?? context.seededBy;
  const ordered = options.categories ?? (anchor ? CATEGORY_RULES[anchor] : DEFAULT_CATEGORIES);

  const chosenKinds = new Set(items.map((i) => i.kind));
  const hasStay = STAY_CATEGORIES.some((v) => chosenKinds.has(v));

  const excludeIds = new Set(
    items.flatMap((i) => (i.ref.source === "catalog" ? [i.ref.listingId] : [])),
  );

  const people = Math.max(1, travelerCount(context.travelers));
  const nights = tripNights(context);
  // Split any stated budget across the categories still to fill, so a $1,200
  // trip doesn't get a $900-a-night suggestion.
  const budget = context.budgetUsd
    ? Math.max(0, context.budgetUsd - items.reduce((n, i) => n + i.subtotalUsd, 0)) /
      Math.max(1, ordered.length)
    : 0;

  const groups: RecommendationGroup[] = [];

  for (const vertical of ordered) {
    if (groups.length >= maxGroups) break;

    // A category the traveller has already satisfied is dropped — unless it's
    // one you'd genuinely book twice (a second activity, a return transfer).
    if (STAY_CATEGORIES.includes(vertical) && hasStay) continue;
    if (chosenKinds.has(vertical) && !REPEATABLE.includes(vertical)) continue;

    // Visas only matter when crossing a border we know about.
    if (vertical === "visa") {
      const from = context.origin?.countryCode ?? context.origin?.country;
      const to = context.destination?.countryCode ?? context.destination?.country;
      if (!to || (from && norm(from) === norm(to))) continue;
    }

    const products = candidatesFor(vertical, context, {
      excludeIds,
      people,
      nights,
      budget,
      limit: perGroup,
    });
    if (products.length === 0) continue;

    const copy = groupCopy(vertical, context, products);
    groups.push({
      key: vertical,
      title: copy.title,
      subtitle: copy.subtitle,
      icon: CATEGORY_ICON[vertical],
      reason: copy.reason,
      fromPriceUsd: Math.min(...products.map((p) => p.priceUsd)),
      items: products,
    });
  }

  return mockDelay(groups, 320);
}

/**
 * The single most relevant next product for a trip — used for the one-line
 * follow-up nudge after a booking ("Would you like to add an airport transfer?").
 * Returns `undefined` rather than inventing something when nothing fits.
 */
export async function getNextBestProduct(
  context: TripContext,
  items: TripItem[] = [],
): Promise<{ group: RecommendationGroup; product: RecommendedProduct } | undefined> {
  const groups = await getRecommendations(context, { items, maxGroups: 1, perGroup: 1 });
  const group = groups[0];
  if (!group || group.items.length === 0) return undefined;
  return { group, product: group.items[0] };
}

/* -------------------------------------------------------------------------- */
/* Combo bundles                                                               */
/* -------------------------------------------------------------------------- */

/** Combo item kinds the trip already covers. */
function overlapCount(comboKinds: BookingVertical[], tripKinds: Set<BookingVertical>): number {
  return comboKinds.filter((k) => tripKinds.has(k)).length;
}

/**
 * Bundles the current trip is eligible for, best saving first.
 *
 * Reuses the platform's own combo definitions and {@link comboTotals} maths —
 * nothing about pricing a bundle is re-implemented here. A combo is offered
 * when it is active, sells the trip's destination, and the traveller has
 * already chosen at least two of the kinds it bundles.
 */
export function getComboSuggestions(
  context: TripContext,
  items: TripItem[],
  nowIso: string,
): Promise<ComboSuggestion[]> {
  const city = norm(context.destination?.city);
  const tripKinds = new Set(items.map((i) => i.kind));

  const suggestions: ComboSuggestion[] = [];
  for (const combo of COMBOS_SEED) {
    if (combo.status !== "active") continue;
    if (nowIso < combo.validFrom || nowIso > combo.validTo) continue;
    if (combo.inventory - combo.sold <= 0) continue;
    if (city && norm(combo.destination) !== city) continue;

    const kinds = combo.items.map((i) => i.kind as BookingVertical);
    const matched = overlapCount(kinds, tripKinds);
    if (matched < 2) continue;

    const totals = comboTotals(combo);
    suggestions.push({
      comboId: combo.id,
      name: combo.name,
      description: combo.description,
      destination: combo.destination,
      separatelyUsd: totals.individualTotal,
      comboPrice: combo.comboPrice,
      savingsUsd: totals.savings,
      items: combo.items.map((i) => ({
        id: i.id,
        kind: i.kind as BookingVertical,
        title: i.title,
        detail: i.detail,
        merchantId: i.merchantId,
        merchantName: i.merchantName,
        priceUsd: i.price,
      })),
      matchedKinds: matched,
      terms: combo.terms,
    });
  }

  suggestions.sort((a, z) => z.savingsUsd - a.savingsUsd);
  return mockDelay(suggestions, 220);
}
