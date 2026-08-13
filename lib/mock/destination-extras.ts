/**
 * Destination extras — the things a traveller needs *after* they land.
 *
 * Baggage, meals and seats are sold against the fare; a data eSIM, a walking
 * tour and a hotel room are sold against the **arrival airport**. They still
 * flow through the ancillary pipeline (same {@link AncillaryOption} shape, same
 * pricing maths, same review lines), so the booking flow needed no second cart.
 *
 * Two rules keep this honest:
 *
 *  - **Activities and hotels are the real catalogue, not invented copy.** They
 *    come from the same listings the stays and experiences verticals sell, so a
 *    hotel offered next to a flight is a hotel the traveller can actually open,
 *    read reviews for and book. Each option carries its listing's `href`.
 *  - **Ids are resolvable without context.** `stay-<slug>` and `act-<slug>` are
 *    looked up in the catalogue; `esim-<CODE>-<tier>` is rebuilt from the
 *    destination code. That matters because pricing runs again at checkout and
 *    once more on the ticket screen, where the destination is no longer in hand
 *    — see {@link resolveAncillary}.
 *
 * Deterministic throughout: no wall-clock reads, no `Math.random`, so server and
 * client render identical rows.
 */

import type { Activity, Hotel, Listing, Resort, Tour } from "@/types/catalog";
import type { AncillaryOption, FlightOffer } from "@/types/flight";
import {
  ACTIVITIES,
  APARTMENTS,
  HOTELS,
  RESORTS,
  TOURS,
} from "@/constants/listings";
import { listingHref } from "@/constants/verticals";
import { parseLocal } from "@/lib/flight-time";
import { AIRPORTS_BY_CODE } from "./airports";

/* -------------------------------------------------------------------------- */
/* Destination eSIM                                                            */
/* -------------------------------------------------------------------------- */

interface EsimTier {
  key: string;
  data: string;
  days: number;
  baseUsd: number;
}

/** The three plans every destination offers, before regional pricing. */
const ESIM_TIERS: EsimTier[] = [
  { key: "lite", data: "3 GB", days: 7, baseUsd: 9 },
  { key: "plus", data: "10 GB", days: 15, baseUsd: 17 },
  { key: "max", data: "Unlimited data", days: 30, baseUsd: 29 },
];

/**
 * Wholesale data costs differ by region far more than travellers expect, so the
 * same plan is cheaper landing in Dhaka than in Tokyo. Countries not listed fall
 * back to 1 — the Gulf/Middle East band Otithee sells most of.
 */
const ESIM_REGION_INDEX: Record<string, number> = {
  BD: 0.8, IN: 0.8, LK: 0.8, NP: 0.8, PK: 0.8, MV: 0.95,
  TH: 0.9, MY: 0.9, SG: 0.95, ID: 0.9, VN: 0.9, PH: 0.9, HK: 1,
  AE: 1, QA: 1, SA: 1, OM: 1, KW: 1, BH: 1, TR: 0.95,
  GB: 1.15, FR: 1.15, NL: 1.15, DE: 1.15, IT: 1.15, ES: 1.15, GR: 1.15,
  JP: 1.25, KR: 1.25, CN: 1.3,
  US: 1.3, CA: 1.3, AU: 1.3,
};

function esimOptions(destinationCode: string): AncillaryOption[] {
  const airport = AIRPORTS_BY_CODE[destinationCode];
  if (!airport) return [];
  const index = ESIM_REGION_INDEX[airport.countryCode] ?? 1;

  return ESIM_TIERS.map((tier) => ({
    id: `esim-${airport.code}-${tier.key}`,
    category: "esim" as const,
    label: `${airport.country} eSIM · ${tier.data}`,
    description: `${tier.days} days of 5G data on ${airport.country}'s main networks. Keep your own number for calls.`,
    priceUsd: Math.round(tier.baseUsd * index),
    icon: "Signal",
    highlights: [tier.data, `${tier.days} days`, "Instant activation"],
    note: "QR code emailed the moment you pay — scan it before you fly, it activates when you land.",
  }));
}

/* -------------------------------------------------------------------------- */
/* Catalogue matching                                                          */
/* -------------------------------------------------------------------------- */

/** Stays a flight traveller would plausibly want, richest inventory first. */
const STAY_POOL: Listing[] = [...HOTELS, ...RESORTS, ...APARTMENTS];

const BY_SLUG: Record<string, Listing> = Object.fromEntries(
  [...STAY_POOL, ...ACTIVITIES, ...TOURS].map((listing) => [listing.slug, listing]),
);

/**
 * Tokens too generic to prove two places are the same — "New York" and "New
 * Delhi" share a word and nothing else.
 */
const WEAK_TOKENS = new Set(["new", "city", "the", "san", "saint", "st", "port"]);

function tokenise(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z]+/g, " ")
    .split(" ")
    .filter((token) => token.length > 2 && !WEAK_TOKENS.has(token));
}

/**
 * Whether a listing sits in the airport's city. Token overlap rather than string
 * equality, because the two datasets spell places differently: "Denpasar (Bali)"
 * against "Bali", "Delhi" against "New Delhi".
 */
function inCity(listing: Listing, cityName: string): boolean {
  const wanted = tokenise(cityName);
  const actual = new Set(tokenise(listing.location.city ?? listing.location.label));
  return wanted.some((token) => actual.has(token));
}

function inCountry(listing: Listing, countryCode: string, countryName: string): boolean {
  if (listing.location.countryCode) {
    return listing.location.countryCode === countryCode;
  }
  const wanted = tokenise(countryName);
  const actual = new Set(tokenise(listing.location.country ?? ""));
  return wanted.some((token) => actual.has(token));
}

/**
 * Best listings near a destination: same city first, topped up with the same
 * country when a city has thin inventory (a Chattogram arrival is still shown
 * Bangladeshi stays, clearly labelled with where they are).
 */
function nearDestination<T extends Listing>(
  pool: T[],
  destinationCode: string,
  limit: number,
): T[] {
  const airport = AIRPORTS_BY_CODE[destinationCode];
  if (!airport) return [];

  const byScore = (a: T, b: T) =>
    (b.rating ?? 0) - (a.rating ?? 0) || a.id.localeCompare(b.id);

  const inTown = pool.filter((l) => inCity(l, airport.city)).sort(byScore);
  if (inTown.length >= limit) return inTown.slice(0, limit);

  const rest = pool
    .filter(
      (l) =>
        !inTown.includes(l) && inCountry(l, airport.countryCode, airport.country),
    )
    .sort(byScore);

  return [...inTown, ...rest].slice(0, limit);
}

/* -------------------------------------------------------------------------- */
/* Activities & stays as ancillaries                                           */
/* -------------------------------------------------------------------------- */

/** Longest a stay can be extended in the booking flow, in nights. */
export const MAX_STAY_NIGHTS = 21;

function experienceOption(listing: Activity | Tour): AncillaryOption {
  const duration =
    listing.vertical === "tours"
      ? `${listing.durationDays} day${listing.durationDays === 1 ? "" : "s"}`
      : `${listing.durationHours} hour${listing.durationHours === 1 ? "" : "s"}`;
  const kind = listing.vertical === "tours" ? listing.tourType : listing.category;

  return {
    id: `act-${listing.slug}`,
    category: "activity",
    label: listing.title,
    description: `${listing.location.label} · ${duration}${kind ? ` · ${kind}` : ""}`,
    priceUsd: listing.price.amount,
    icon: "Ticket",
    highlights: [duration, ...(listing.badges ?? []).slice(0, 1)],
    rating: listing.rating,
    reviewCount: listing.reviewCount,
    imageUrl: listing.image,
    href: listingHref(listing),
    note: "Tickets are issued per traveller and emailed with your itinerary.",
  };
}

function stayOption(listing: Listing): AncillaryOption {
  const stars = "stars" in listing ? (listing as Hotel | Resort).stars : undefined;
  const amenities = "amenities" in listing ? (listing as Hotel | Resort).amenities : [];

  return {
    id: `stay-${listing.slug}`,
    category: "stay",
    label: listing.title,
    description: `${listing.location.label} · one room, ${listing.price.unit ?? "per night"}.`,
    priceUsd: listing.price.amount,
    // Charged per night rather than per traveller: the quantity stepper counts
    // nights, defaulted to the gap between the outbound and return flights.
    perBooking: true,
    unitLabel: "night",
    maxQuantity: MAX_STAY_NIGHTS,
    icon: "BedDouble",
    highlights: [
      ...(stars ? [`${stars}-star`] : []),
      ...amenities.slice(0, 2),
      ...(listing.badges ?? []).slice(0, 1),
    ],
    rating: listing.rating,
    reviewCount: listing.reviewCount,
    imageUrl: listing.image,
    href: listingHref(listing),
    note: "Booked alongside your flight and confirmed on the same reference. Free cancellation up to 48 hours before check-in.",
  };
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Things to do on the ground: single-session activities first, topped up with
 * short tours only where a city has thin activity inventory.
 *
 * Ranking the two pools together would bury a $28 sunset cruise under a
 * five-star, $1,300 multi-day package — technically the better-reviewed listing,
 * and not remotely the same purchase as an airline extra.
 */
function experiencesNear(destinationCode: string, limit: number): Array<Activity | Tour> {
  const activities = nearDestination(ACTIVITIES, destinationCode, limit);
  if (activities.length >= limit) return activities;
  const tours = nearDestination(TOURS, destinationCode, limit - activities.length);
  return [...activities, ...tours];
}

/**
 * Every extra offered for the destination the traveller lands at, in the order
 * the booking flow renders them: connectivity, then things to do, then a bed.
 */
export function destinationExtras(destinationCode: string): AncillaryOption[] {
  return [
    ...esimOptions(destinationCode),
    ...experiencesNear(destinationCode, 4).map(experienceOption),
    ...nearDestination(STAY_POOL, destinationCode, 3).map(stayOption),
  ];
}

/**
 * Rebuild one destination extra from its id alone.
 *
 * The seam that lets destination extras price identically at checkout and on the
 * ticket, where all that survives is `{ optionId, quantity }`.
 */
export function destinationExtraById(id: string): AncillaryOption | undefined {
  if (id.startsWith("esim-")) {
    const code = id.slice("esim-".length).split("-")[0];
    return esimOptions(code).find((option) => option.id === id);
  }
  if (id.startsWith("act-")) {
    const listing = BY_SLUG[id.slice("act-".length)];
    return listing && (listing.vertical === "activities" || listing.vertical === "tours")
      ? experienceOption(listing as Activity | Tour)
      : undefined;
  }
  if (id.startsWith("stay-")) {
    const listing = BY_SLUG[id.slice("stay-".length)];
    return listing && listing.vertical !== "activities" && listing.vertical !== "tours"
      ? stayOption(listing)
      : undefined;
  }
  return undefined;
}

/**
 * Where the traveller is actually *going* — the turnaround point, not the last
 * airport on the itinerary.
 *
 * A round trip's final slice lands back home, so reading the last `toCode`
 * would sell a Dhaka resident a Dhaka hotel for their Dubai holiday. Whenever
 * the itinerary returns to where it started, the leg before it is the trip.
 */
export function destinationCodeOf(offer: FlightOffer): string {
  const origin = offer.slices[0].fromCode;
  const last = offer.slices[offer.slices.length - 1];
  if (last.toCode !== origin) return last.toCode;
  return offer.slices[offer.slices.length - 2]?.toCode ?? last.toCode;
}

/** City name for section headings, e.g. "Dubai". Falls back to the IATA code. */
export function destinationCityName(destinationCode: string): string {
  return AIRPORTS_BY_CODE[destinationCode]?.city ?? destinationCode;
}

/**
 * Nights on the ground, used to pre-fill a hotel's night count.
 *
 * A round trip states it exactly — arrival of the outbound to departure of the
 * return. A one-way doesn't, so we suggest three nights and let the traveller
 * adjust rather than guessing at a total they'd only discover at payment.
 */
export function stayNights(offer: FlightOffer): number {
  const arrive = offer.slices[0]?.arriveLocal;
  const returnDepart = offer.slices[1]?.departLocal;
  if (offer.tripType !== "round-trip" || !arrive || !returnDepart) return 3;

  const days = Math.round(
    (parseLocal(returnDepart.slice(0, 10)) - parseLocal(arrive.slice(0, 10))) /
      86_400_000,
  );
  return Math.min(MAX_STAY_NIGHTS, Math.max(1, days));
}
