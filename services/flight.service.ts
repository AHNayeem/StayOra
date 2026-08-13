/**
 * flight.service — the single seam every flight surface reads through.
 *
 * No flight UI imports `lib/mock/*` directly. Components call these functions,
 * which return Promises with simulated latency, so the entire module is already
 * written against a network boundary. Replacing the mock is a body swap:
 * `searchFlights` becomes `POST /flights/search`, `getOffer` becomes
 * `GET /flights/offers/:id`, and nothing above this file changes.
 *
 * Two design choices make that swap real rather than aspirational:
 *
 *  1. **Offer ids are self-describing.** `/flights/<id>` rebuilds its offer from
 *     the id alone, with no session or server cache — the same contract a real
 *     offer-cache endpoint provides.
 *  2. **Filtering and sorting are exposed as pure functions** ({@link applyFilters},
 *     {@link sortOffers}) rather than baked into the search call, so they can run
 *     client-side today and move server-side later without touching the views.
 */

import type {
  Aircraft,
  Airline,
  Airport,
  AncillaryOption,
  BoardingPass,
  FarePricePoint,
  FlightBooking,
  FlightDeal,
  FlightFilters,
  FlightOffer,
  FlightSearchQuery,
  FlightSearchResult,
  FlightSort,
  PopularRoute,
  SeatMap,
  VisaRequirement,
} from "@/types/flight";
import { SeededRandom } from "@/lib/random";
import { addDays, bandOf, daysBetween } from "@/lib/flight-time";
import {
  AIRLINES,
  AIRLINES_BY_CODE,
  AIRCRAFT,
  AIRCRAFT_BY_CODE,
  findAircraft,
  findAirline,
} from "@/lib/mock/airlines";
import {
  AIRPORTS,
  AIRPORTS_BY_CODE,
  POPULAR_AIRPORTS,
  distanceKm,
  findAirport,
} from "@/lib/mock/airports";
import {
  generateOffers,
  offerFromId,
  totalDuration,
  totalStops,
} from "@/lib/mock/flights";
import { buildSeatMap } from "@/lib/mock/seatmap";
import {
  ANCILLARY_OPTIONS,
  ancillariesTotal,
  includedAncillaryIds,
  isRelevant,
} from "@/lib/mock/ancillaries";
import {
  destinationCodeOf,
  destinationExtras,
} from "@/lib/mock/destination-extras";
import { baseFareForDistance } from "@/lib/mock/fares";
import {
  FLIGHT_DEALS,
  PARTNER_AIRLINE_CODES,
  POPULAR_ROUTES,
  SEASONAL_OFFERS,
  routesFrom,
} from "@/lib/mock/routes";
import { DEMO_FLIGHT_BOOKINGS } from "@/lib/mock/passengers";
import { buildBoardingPasses } from "@/lib/mock/boarding-pass";
import { mockDelay } from "./http";

/* -------------------------------------------------------------------------- */
/* Reference data                                                              */
/* -------------------------------------------------------------------------- */

/** All airports (admin tables, country selectors). */
export function getAirports(): Promise<Airport[]> {
  return mockDelay(AIRPORTS, 200);
}

/** All airlines, alphabetical by name. */
export function getAirlines(): Promise<Airline[]> {
  return mockDelay([...AIRLINES].sort((a, b) => a.name.localeCompare(b.name)), 200);
}

/** All aircraft types. */
export function getAircraftTypes(): Promise<Aircraft[]> {
  return mockDelay(AIRCRAFT, 150);
}

/** Airlines Otithee markets as partners, in curated order. */
export function getPartnerAirlines(): Promise<Airline[]> {
  const partners = PARTNER_AIRLINE_CODES.map((code) => AIRLINES_BY_CODE[code]).filter(
    (a): a is Airline => Boolean(a),
  );
  return mockDelay(partners, 200);
}

/**
 * Airport autocomplete.
 *
 * Ranks exact IATA matches first (people type "DAC" and expect Dhaka), then
 * city prefix, then airport-name and country substring matches — so "lon"
 * surfaces London's airports before "Colombo", which merely contains the
 * letters.
 */
export function searchAirports(query: string, limit = 8): Promise<Airport[]> {
  const q = query.trim().toLowerCase();
  if (!q) return mockDelay(POPULAR_AIRPORTS.slice(0, limit), 120);

  const scored: Array<{ airport: Airport; score: number }> = [];
  for (const airport of AIRPORTS) {
    const code = airport.code.toLowerCase();
    const city = airport.city.toLowerCase();
    const name = airport.name.toLowerCase();
    const country = airport.country.toLowerCase();

    let score = 0;
    if (code === q) score = 100;
    else if (code.startsWith(q)) score = 80;
    else if (city.startsWith(q)) score = 60;
    else if (city.includes(q)) score = 40;
    else if (name.startsWith(q)) score = 30;
    else if (name.includes(q)) score = 20;
    else if (country.startsWith(q)) score = 15;
    else if (country.includes(q)) score = 8;

    if (score > 0) {
      if (airport.popular) score += 5;
      scored.push({ airport, score });
    }
  }

  scored.sort((a, b) => b.score - a.score || a.airport.city.localeCompare(b.airport.city));
  return mockDelay(scored.slice(0, limit).map((s) => s.airport), 180);
}

/** Resolve one airport by IATA code. */
export function getAirport(code: string): Promise<Airport | undefined> {
  return mockDelay(findAirport(code), 100);
}

/** Resolve one airline by IATA designator. */
export function getAirline(code: string): Promise<Airline | undefined> {
  return mockDelay(findAirline(code), 100);
}

/* -------------------------------------------------------------------------- */
/* Merchandising                                                               */
/* -------------------------------------------------------------------------- */

/** Curated popular routes for the landing page and empty states. */
export function getPopularRoutes(limit = 12): Promise<PopularRoute[]> {
  return mockDelay(POPULAR_ROUTES.slice(0, limit), 250);
}

/** Popular routes departing a specific airport. */
export function getRoutesFrom(code: string, limit = 6): Promise<PopularRoute[]> {
  return mockDelay(routesFrom(code, limit), 250);
}

/** Merchandised flight deals for the home page and landing rails. */
export function getFlightDeals(limit = 8): Promise<FlightDeal[]> {
  return mockDelay(FLIGHT_DEALS.slice(0, limit), 300);
}

/** Seasonal campaign cards. */
export function getSeasonalOffers(): Promise<typeof SEASONAL_OFFERS> {
  return mockDelay(SEASONAL_OFFERS, 250);
}

/* -------------------------------------------------------------------------- */
/* Search                                                                      */
/* -------------------------------------------------------------------------- */

/** A search query with every optional field defaulted — safe to pass anywhere. */
export function normalizeQuery(
  partial: Partial<FlightSearchQuery> & { legs?: FlightLegInput[] },
): FlightSearchQuery {
  const legs = (partial.legs ?? [])
    .filter((l): l is FlightLegInput => Boolean(l?.from && l?.to && l?.date))
    .map((l) => ({
      from: l.from.trim().toUpperCase(),
      to: l.to.trim().toUpperCase(),
      date: l.date,
    }));

  const passengers = partial.passengers ?? { adults: 1, children: 0, infants: 0 };

  return {
    tripType: partial.tripType ?? "one-way",
    legs,
    passengers: {
      adults: Math.max(1, Math.min(9, passengers.adults)),
      children: Math.max(0, Math.min(8, passengers.children)),
      // An infant needs a lap, so never more infants than adults.
      infants: Math.max(0, Math.min(passengers.adults, passengers.infants)),
    },
    cabin: partial.cabin ?? "economy",
    directOnly: partial.directOnly ?? false,
    flexibleDates: partial.flexibleDates ?? false,
    nearbyAirports: partial.nearbyAirports ?? false,
    refundableOnly: partial.refundableOnly ?? false,
    baggageIncluded: partial.baggageIncluded ?? false,
    preferredAirlines: partial.preferredAirlines ?? [],
  };
}

interface FlightLegInput {
  from: string;
  to: string;
  date: string;
}

/** Whether a query has everything it needs to be run. */
export function isQueryComplete(query: FlightSearchQuery): boolean {
  if (query.legs.length === 0) return false;
  return query.legs.every(
    (leg) =>
      leg.from &&
      leg.to &&
      leg.from !== leg.to &&
      Boolean(AIRPORTS_BY_CODE[leg.from]) &&
      Boolean(AIRPORTS_BY_CODE[leg.to]) &&
      /^\d{4}-\d{2}-\d{2}$/.test(leg.date),
  );
}

/**
 * Run a flight search. Returns the offers plus the facet ranges the filter rail
 * needs, and — when `flexibleDates` is set — a ±3-day price strip.
 */
export function searchFlights(query: FlightSearchQuery): Promise<FlightSearchResult> {
  const normalized = normalizeQuery(query);
  if (!isQueryComplete(normalized)) {
    return mockDelay(
      {
        query: normalized,
        offers: [],
        facets: emptyFacets(),
        priceCalendar: [],
        total: 0,
      },
      300,
    );
  }

  const offers = generateOffers(normalized);
  const result: FlightSearchResult = {
    query: normalized,
    offers,
    facets: buildFacets(offers),
    priceCalendar: normalized.flexibleDates ? buildPriceCalendar(normalized) : [],
    total: offers.length,
  };
  // Search is the slowest call in the module — the loading state has to earn
  // its keep, so this latency is deliberately realistic.
  return mockDelay(result, 900);
}

/** Rebuild a single offer from its id (`GET /flights/offers/:id`). */
export function getOffer(id: string): Promise<FlightOffer | undefined> {
  return mockDelay(offerFromId(id), 450);
}

/**
 * Re-price an offer immediately before payment. A real integration *must* do
 * this — fares expire — so the flow calls it and is already shaped to handle a
 * price change or an outright expiry.
 */
export function priceOffer(
  id: string,
): Promise<{ offer: FlightOffer; changed: boolean } | { expired: true }> {
  const offer = offerFromId(id);
  if (!offer) return mockDelay({ expired: true as const }, 600);
  return mockDelay({ offer, changed: false }, 600);
}

function emptyFacets(): FlightSearchResult["facets"] {
  return {
    priceMinUsd: 0,
    priceMaxUsd: 0,
    minDurationMinutes: 0,
    maxDurationMinutes: 0,
    airlines: [],
    alliances: [],
    stops: [],
  };
}

/** Derive filter bounds and counts from an unfiltered result set. */
function buildFacets(offers: FlightOffer[]): FlightSearchResult["facets"] {
  if (offers.length === 0) return emptyFacets();

  const prices = offers.map((o) => o.fare.totalUsd);
  const durations = offers.map(totalDuration);

  const byAirline = new Map<string, { count: number; fromUsd: number }>();
  const byAlliance = new Map<string, number>();
  const byStops = new Map<number, { count: number; fromUsd: number }>();

  for (const offer of offers) {
    const airline = byAirline.get(offer.airlineCode);
    byAirline.set(offer.airlineCode, {
      count: (airline?.count ?? 0) + 1,
      fromUsd: Math.min(airline?.fromUsd ?? Infinity, offer.fare.totalUsd),
    });

    const alliance = AIRLINES_BY_CODE[offer.airlineCode]?.alliance ?? "None";
    byAlliance.set(alliance, (byAlliance.get(alliance) ?? 0) + 1);

    // Bucket 2+ stops together — nobody filters for "exactly three stops".
    const stops = Math.min(2, totalStops(offer));
    const bucket = byStops.get(stops);
    byStops.set(stops, {
      count: (bucket?.count ?? 0) + 1,
      fromUsd: Math.min(bucket?.fromUsd ?? Infinity, offer.fare.totalUsd),
    });
  }

  return {
    priceMinUsd: Math.min(...prices),
    priceMaxUsd: Math.max(...prices),
    minDurationMinutes: Math.min(...durations),
    maxDurationMinutes: Math.max(...durations),
    airlines: [...byAirline.entries()]
      .map(([code, v]) => ({ code, count: v.count, fromUsd: v.fromUsd }))
      .sort((a, b) => a.fromUsd - b.fromUsd),
    alliances: [...byAlliance.entries()]
      .map(([alliance, count]) => ({
        alliance: alliance as FlightSearchResult["facets"]["alliances"][number]["alliance"],
        count,
      }))
      .sort((a, b) => b.count - a.count),
    stops: [...byStops.entries()]
      .map(([stops, v]) => ({ stops, count: v.count, fromUsd: v.fromUsd }))
      .sort((a, b) => a.stops - b.stops),
  };
}

/**
 * Indicative prices for the ±3 days around the outbound date. Estimated from the
 * fare model rather than by running seven full searches — which is exactly what
 * a real price-calendar endpoint does, for the same reason.
 */
function buildPriceCalendar(query: FlightSearchQuery): FarePricePoint[] {
  const leg = query.legs[0];
  const km = distanceKm(leg.from, leg.to);
  const base = baseFareForDistance(km, query.cabin);

  const points: FarePricePoint[] = [];
  for (let offset = -3; offset <= 3; offset++) {
    const date = addDays(leg.date, offset);
    const rng = new SeededRandom(`cal:${leg.from}${leg.to}${date}${query.cabin}`);
    // Weekend departures cost more; midweek is the sweet spot.
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    const weekendFactor = weekday === 5 || weekday === 6 || weekday === 0 ? 1.12 : 1;
    const fromUsd = Math.round(base * weekendFactor * rng.float(0.88, 1.18) + 31);
    points.push({ date, fromUsd, cheapest: false });
  }

  const min = Math.min(...points.map((p) => p.fromUsd));
  return points.map((p) => ({ ...p, cheapest: p.fromUsd === min }));
}

/* -------------------------------------------------------------------------- */
/* Client-side result shaping                                                  */
/* -------------------------------------------------------------------------- */

/** A no-op filter set, seeded from the facets so the sliders start at full range. */
export function defaultFilters(facets: FlightSearchResult["facets"]): FlightFilters {
  return {
    stops: [],
    airlines: [],
    alliances: [],
    priceMinUsd: facets.priceMinUsd,
    priceMaxUsd: facets.priceMaxUsd,
    departBands: [],
    arriveBands: [],
    maxDurationMinutes: 0,
    maxLayoverMinutes: 0,
    refundableOnly: false,
    baggageIncluded: false,
  };
}

/** How many filters the traveller has actually engaged — drives the "clear" chip. */
export function activeFilterCount(
  filters: FlightFilters,
  facets: FlightSearchResult["facets"],
): number {
  let count = 0;
  if (filters.stops.length) count += 1;
  if (filters.airlines.length) count += 1;
  if (filters.alliances.length) count += 1;
  if (filters.departBands.length) count += 1;
  if (filters.arriveBands.length) count += 1;
  if (filters.maxDurationMinutes > 0) count += 1;
  if (filters.maxLayoverMinutes > 0) count += 1;
  if (filters.refundableOnly) count += 1;
  if (filters.baggageIncluded) count += 1;
  if (
    filters.priceMinUsd > facets.priceMinUsd ||
    filters.priceMaxUsd < facets.priceMaxUsd
  ) {
    count += 1;
  }
  return count;
}

/** The longest single layover on an offer, minutes (0 for non-stop). */
export function longestLayover(offer: FlightOffer): number {
  const all = offer.slices.flatMap((s) => s.layovers.map((l) => l.durationMinutes));
  return all.length ? Math.max(...all) : 0;
}

/** Narrow a result set. Pure — safe to run on every keystroke. */
export function applyFilters(
  offers: FlightOffer[],
  filters: FlightFilters,
): FlightOffer[] {
  return offers.filter((offer) => {
    if (filters.stops.length) {
      const stops = Math.min(2, totalStops(offer));
      if (!filters.stops.includes(stops)) return false;
    }
    if (filters.airlines.length && !filters.airlines.includes(offer.airlineCode)) {
      return false;
    }
    if (filters.alliances.length) {
      const alliance = AIRLINES_BY_CODE[offer.airlineCode]?.alliance ?? "None";
      if (!filters.alliances.includes(alliance)) return false;
    }
    if (offer.fare.totalUsd < filters.priceMinUsd) return false;
    if (offer.fare.totalUsd > filters.priceMaxUsd) return false;

    if (filters.departBands.length) {
      if (!filters.departBands.includes(bandOf(offer.slices[0].departLocal))) return false;
    }
    if (filters.arriveBands.length) {
      const last = offer.slices[offer.slices.length - 1];
      if (!filters.arriveBands.includes(bandOf(last.arriveLocal))) return false;
    }
    if (filters.maxDurationMinutes > 0 && totalDuration(offer) > filters.maxDurationMinutes) {
      return false;
    }
    if (filters.maxLayoverMinutes > 0 && longestLayover(offer) > filters.maxLayoverMinutes) {
      return false;
    }
    if (filters.refundableOnly && !offer.refundable) return false;
    if (filters.baggageIncluded && offer.baggage.checkedKg <= 0) return false;
    return true;
  });
}

/** Order a result set. Pure; `recommended` preserves the service's own ranking. */
export function sortOffers(offers: FlightOffer[], sort: FlightSort): FlightOffer[] {
  const sorted = [...offers];
  switch (sort) {
    case "cheapest":
      return sorted.sort((a, b) => a.fare.totalUsd - b.fare.totalUsd);
    case "fastest":
      return sorted.sort((a, b) => totalDuration(a) - totalDuration(b));
    case "earliest-departure":
      return sorted.sort((a, b) =>
        a.slices[0].departLocal.localeCompare(b.slices[0].departLocal),
      );
    case "latest-departure":
      return sorted.sort((a, b) =>
        b.slices[0].departLocal.localeCompare(a.slices[0].departLocal),
      );
    default:
      // "Recommended" — the badge the generator already assigned leads, then
      // the service's own price-ranked order.
      return sorted.sort((a, b) => {
        const aBest = a.badges.includes("recommended") ? 0 : 1;
        const bBest = b.badges.includes("recommended") ? 0 : 1;
        return aBest - bBest || a.fare.totalUsd - b.fare.totalUsd;
      });
  }
}

/* -------------------------------------------------------------------------- */
/* Seats & ancillaries                                                         */
/* -------------------------------------------------------------------------- */

/** Seat maps for every segment on an offer, in journey order. */
export function getSeatMaps(offerId: string): Promise<SeatMap[]> {
  const offer = offerFromId(offerId);
  if (!offer) return mockDelay([], 400);
  const maps = offer.slices.flatMap((slice) => slice.segments.map(buildSeatMap));
  return mockDelay(maps, 650);
}

/**
 * The ancillary catalogue for one offer: the flight-side extras this party can
 * actually buy, followed by the extras sold against where they land — a local
 * eSIM, experiences and stays in the destination city.
 *
 * Both halves come back in one call because the booking flow treats them as one
 * cart; only the group each option declares decides where it renders.
 */
export function getAncillaries(offerId: string): Promise<AncillaryOption[]> {
  const offer = offerFromId(offerId);
  if (!offer) return mockDelay(ANCILLARY_OPTIONS, 400);

  const included = new Set(includedAncillaryIds(offer.cabin, offer.mealsIncluded));
  const options = ANCILLARY_OPTIONS.filter(
    (option) => !included.has(option.id) && isRelevant(option, offer.passengers),
  );
  return mockDelay([...options, ...destinationExtras(destinationCodeOf(offer))], 400);
}

/** Extras already covered by the fare — rendered as "Included", never sold. */
export function getIncludedAncillaries(offer: FlightOffer): AncillaryOption[] {
  const included = new Set(includedAncillaryIds(offer.cabin, offer.mealsIncluded));
  return ANCILLARY_OPTIONS.filter((option) => included.has(option.id));
}

export { ancillariesTotal };

/* -------------------------------------------------------------------------- */
/* Visa awareness                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Indicative visa status for a destination, given the traveller's nationality.
 *
 * Deliberately advisory: it links into Otithee's visa vertical rather than
 * asserting an entitlement, because getting this wrong strands someone at an
 * airport. Real integrations query a licensed entry-requirements provider.
 */
export function getVisaRequirement(
  destinationCode: string,
  nationality: string,
): Promise<VisaRequirement> {
  const airport = AIRPORTS_BY_CODE[destinationCode];
  if (!airport) {
    return mockDelay(
      {
        destinationCountry: "Unknown",
        status: "unknown",
        note: "We couldn't determine entry requirements for this destination.",
      },
      300,
    );
  }

  const visaFree: Record<string, string[]> = {
    BD: ["MV", "NP", "LK", "ID", "MY"],
  };
  const onArrival: Record<string, string[]> = {
    BD: ["TH", "AE", "QA", "JO", "BH"],
  };

  const nat = nationality.toUpperCase();
  let status: VisaRequirement["status"] = "required";
  if (nat === airport.countryCode) status = "visa-free";
  else if (visaFree[nat]?.includes(airport.countryCode)) status = "visa-free";
  else if (onArrival[nat]?.includes(airport.countryCode)) status = "on-arrival";
  else if (["TR", "IN", "LK", "MY"].includes(airport.countryCode)) status = "e-visa";

  const NOTE: Record<VisaRequirement["status"], string> = {
    "visa-free": `No visa needed for ${airport.country} on this passport.`,
    "on-arrival": `A visa on arrival is generally available in ${airport.country}. Carry return tickets and proof of funds.`,
    "e-visa": `${airport.country} offers an e-visa. Apply online before you fly.`,
    required: `A visa is required for ${airport.country}. Apply well before departure.`,
    unknown: "We couldn't determine entry requirements for this destination.",
  };

  return mockDelay(
    {
      destinationCountry: airport.country,
      status,
      note: NOTE[status],
      href: status === "visa-free" ? undefined : "/all-visa",
    },
    350,
  );
}

/* -------------------------------------------------------------------------- */
/* Bookings                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The traveller's flight bookings from the server dataset. The client store
 * (`features/flights/bookings-store`) layers freshly-created bookings on top,
 * exactly as `created-bookings` does for stays.
 */
export function getFlightBookings(): Promise<FlightBooking[]> {
  const sorted = [...DEMO_FLIGHT_BOOKINGS].sort((a, b) =>
    b.slices[0].departLocal.localeCompare(a.slices[0].departLocal),
  );
  return mockDelay(sorted, 400);
}

/** One flight booking by id, or `undefined` (route renders not-found). */
export function getFlightBooking(id: string): Promise<FlightBooking | undefined> {
  return mockDelay(
    DEMO_FLIGHT_BOOKINGS.find((b) => b.id === id),
    350,
  );
}

/** Boarding passes for a booking — derived, never stored. */
export function getBoardingPasses(booking: FlightBooking): Promise<BoardingPass[]> {
  return mockDelay(buildBoardingPasses(booking), 400);
}

/**
 * Request a refund (mock). Mirrors `POST /flights/bookings/:id/refund`: computes
 * what would actually be returned after the fare's cancellation fee, so the
 * confirmation dialog can state a real number rather than a promise.
 */
export function requestRefund(
  booking: FlightBooking,
): Promise<{ ok: true; refundUsd: number; feeUsd: number } | { ok: false; reason: string }> {
  if (booking.status === "cancelled") {
    return mockDelay({ ok: false, reason: "This booking is already cancelled." }, 500);
  }
  if (booking.status === "completed") {
    return mockDelay(
      { ok: false, reason: "This trip has already been flown and can't be refunded." },
      500,
    );
  }
  if (!booking.refundable) {
    return mockDelay(
      {
        ok: false,
        reason:
          "This fare is non-refundable. You may still be able to claim government taxes — contact support.",
      },
      500,
    );
  }
  const feeUsd = booking.cancellationFeeUsd;
  return mockDelay(
    { ok: true, refundUsd: Math.max(0, booking.grandTotalUsd - feeUsd), feeUsd },
    800,
  );
}

/**
 * Quote a date change (mock). Returns the airline's change fee plus any fare
 * difference — the two components every real change quote is made of.
 */
export function quoteChange(
  booking: FlightBooking,
  newDate: string,
): Promise<
  | { ok: true; changeFeeUsd: number; fareDifferenceUsd: number; newDate: string }
  | { ok: false; reason: string }
> {
  if (!booking.changeable) {
    return mockDelay(
      { ok: false, reason: "This fare can't be changed. You'd need to book a new flight." },
      500,
    );
  }
  const currentDate = booking.slices[0].departLocal.slice(0, 10);
  const shift = daysBetween(currentDate, newDate);
  if (shift === 0) {
    return mockDelay({ ok: false, reason: "Pick a different departure date." }, 400);
  }

  const rng = new SeededRandom(`change:${booking.id}:${newDate}`);
  // Moving closer to departure costs more; moving later often costs less.
  const direction = shift < 0 ? 1.4 : 0.8;
  const fareDifferenceUsd = Math.round(
    booking.fare.baseFareUsd * rng.float(-0.08, 0.16, 3) * direction,
  );

  return mockDelay(
    {
      ok: true,
      changeFeeUsd: Math.round(booking.fare.baseFareUsd * 0.06),
      fareDifferenceUsd,
      newDate,
    },
    800,
  );
}

export { findAircraft, findAirline, findAirport, totalDuration, totalStops };
export { AIRCRAFT_BY_CODE, AIRLINES_BY_CODE, AIRPORTS_BY_CODE };
