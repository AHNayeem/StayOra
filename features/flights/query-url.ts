/**
 * Flight search queries ↔ URL.
 *
 * The URL is the single source of truth for a search. That is what makes a
 * results page shareable, bookmarkable, back-button-correct and server-
 * renderable — the page reads its query from `searchParams`, never from client
 * state that a refresh would lose.
 *
 * Both directions live here so the search panel, the results page, the deal
 * cards and the saved-search store all agree on the encoding.
 */

import type { CabinClass, FlightSearchQuery, TripType } from "@/types/flight";
import { CABIN_CLASSES, TRIP_TYPES } from "@/types/flight";

/** Raw `searchParams` shape the App Router hands a page. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

/** First value of a possibly-repeated query param. */
function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function boolParam(value: string | string[] | undefined): boolean {
  return first(value) === "1";
}

function intParam(value: string | string[] | undefined, fallback: number): number {
  const n = Number(first(value));
  return Number.isFinite(n) ? n : fallback;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const IATA = /^[A-Z]{3}$/;

/**
 * Build a query string from a search.
 *
 * Legs are encoded as repeated `leg` params (`leg=DAC-DXB-2026-08-12`) rather
 * than indexed keys, which keeps multi-city URLs readable and order-preserving.
 */
export function queryToParams(query: FlightSearchQuery): URLSearchParams {
  const params = new URLSearchParams();
  params.set("trip", query.tripType);
  for (const leg of query.legs) {
    params.append("leg", `${leg.from}-${leg.to}-${leg.date}`);
  }
  params.set("adults", String(query.passengers.adults));
  if (query.passengers.children > 0) params.set("children", String(query.passengers.children));
  if (query.passengers.infants > 0) params.set("infants", String(query.passengers.infants));
  params.set("cabin", query.cabin);
  if (query.directOnly) params.set("direct", "1");
  if (query.flexibleDates) params.set("flex", "1");
  if (query.nearbyAirports) params.set("nearby", "1");
  if (query.refundableOnly) params.set("refundable", "1");
  if (query.baggageIncluded) params.set("baggage", "1");
  if (query.preferredAirlines.length) {
    params.set("airlines", query.preferredAirlines.join(","));
  }
  return params;
}

/** Full results URL for a search. */
export function searchHref(query: FlightSearchQuery): string {
  return `/flights/search?${queryToParams(query).toString()}`;
}

/**
 * Parse a search out of `searchParams`.
 *
 * Deliberately lenient: anything malformed falls back to a sane default rather
 * than throwing, because these values arrive from a URL bar and a hand-edited
 * query should degrade to a usable search, not a crash. Callers check
 * {@link import("@/services/flight.service").isQueryComplete} to decide whether
 * there is enough to actually run.
 */
export function paramsToQuery(params: RawSearchParams): FlightSearchQuery {
  const tripRaw = first(params.trip) as TripType;
  const tripType: TripType = TRIP_TYPES.includes(tripRaw) ? tripRaw : "one-way";

  const cabinRaw = first(params.cabin) as CabinClass;
  const cabin: CabinClass = CABIN_CLASSES.includes(cabinRaw) ? cabinRaw : "economy";

  const rawLegs = params.leg;
  const legStrings = Array.isArray(rawLegs) ? rawLegs : rawLegs ? [rawLegs] : [];

  const legs = legStrings
    .map((raw) => {
      // `DAC-DXB-2026-08-12` → the date itself contains hyphens, so split from
      // the left exactly twice and keep the remainder whole.
      const firstDash = raw.indexOf("-");
      const secondDash = raw.indexOf("-", firstDash + 1);
      if (firstDash < 0 || secondDash < 0) return null;
      const from = raw.slice(0, firstDash).toUpperCase();
      const to = raw.slice(firstDash + 1, secondDash).toUpperCase();
      const date = raw.slice(secondDash + 1);
      if (!IATA.test(from) || !IATA.test(to) || !ISO_DATE.test(date)) return null;
      return { from, to, date };
    })
    .filter((leg): leg is { from: string; to: string; date: string } => leg !== null);

  const adults = Math.max(1, Math.min(9, intParam(params.adults, 1)));

  return {
    tripType,
    // A round-trip needs exactly two legs; anything else is a malformed URL and
    // is better served as the one-way it actually describes.
    legs: tripType === "round-trip" && legs.length < 2 ? legs.slice(0, 1) : legs,
    passengers: {
      adults,
      children: Math.max(0, Math.min(8, intParam(params.children, 0))),
      infants: Math.max(0, Math.min(adults, intParam(params.infants, 0))),
    },
    cabin,
    directOnly: boolParam(params.direct),
    flexibleDates: boolParam(params.flex),
    nearbyAirports: boolParam(params.nearby),
    refundableOnly: boolParam(params.refundable),
    baggageIncluded: boolParam(params.baggage),
    preferredAirlines: first(params.airlines)
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean),
  };
}

/** Parse a query out of a `?…` string (client-side, from `useSearchParams`). */
export function searchStringToQuery(search: string): FlightSearchQuery {
  const params = new URLSearchParams(search);
  const raw: RawSearchParams = {};
  for (const key of new Set(params.keys())) {
    const all = params.getAll(key);
    raw[key] = all.length > 1 ? all : all[0];
  }
  return paramsToQuery(raw);
}

/** Stable key for a query — cache keys, dedupe, saved-search identity. */
export function queryKey(query: FlightSearchQuery): string {
  return queryToParams(query).toString();
}
