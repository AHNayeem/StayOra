/**
 * Merchandised routes and deals — the curated content behind the flights
 * landing page, the home-page rails and the empty-state suggestions.
 *
 * Dates are anchored to {@link FLIGHT_CALENDAR_ANCHOR}, a fixed constant rather
 * than `Date.now()`, so the server and client render identical markup. The
 * search form separately defaults to *real* upcoming dates on the client, which
 * is a UI concern and stays out of the data layer.
 */

import type { CabinClass, FlightDeal, PopularRoute } from "@/types/flight";
import { SeededRandom } from "@/lib/random";
import { addDays } from "@/lib/flight-time";
import { AIRPORTS_BY_CODE, distanceKm } from "./airports";
import { AIRCRAFT_BY_CODE, AIRLINES_BY_CODE, fleetFor } from "./airlines";
import { baseFareForDistance } from "./fares";

/**
 * Fixed reference date for all merchandised departure dates. Keeping this a
 * constant (never a wall-clock read) is what makes the landing page hydrate
 * cleanly — see {@link "@/lib/random"} for the same rule applied to listings.
 */
export const FLIGHT_CALENDAR_ANCHOR = "2026-09-15";

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

/** Curated city pairs, ordered by how heavily Otithee sells them. */
const ROUTE_SEEDS: Array<{
  from: string;
  to: string;
  airline: string;
  direct: boolean;
  image: string;
}> = [
  { from: "DAC", to: "DXB", airline: "EK", direct: true, image: img("photo-1512453979798-5ea266f8880c") },
  { from: "DAC", to: "CXB", airline: "BS", direct: true, image: img("photo-1544551763-46a013bb70d5") },
  { from: "DAC", to: "BKK", airline: "TG", direct: true, image: img("photo-1508009603885-50cf7c579365") },
  { from: "DAC", to: "KUL", airline: "MH", direct: true, image: img("photo-1596422846543-75c6fc197f07") },
  { from: "DAC", to: "SIN", airline: "SQ", direct: true, image: img("photo-1525625293386-3f8f99389edd") },
  { from: "DAC", to: "DOH", airline: "QR", direct: true, image: img("photo-1539650116574-75c0c6d73f6e") },
  { from: "DAC", to: "JED", airline: "SV", direct: true, image: img("photo-1519817650390-64a93db51149") },
  { from: "DAC", to: "IST", airline: "TK", direct: true, image: img("photo-1541432901042-2d8bd64b4a9b") },
  { from: "DAC", to: "LHR", airline: "BG", direct: true, image: img("photo-1513635269975-59663e0ac1ad") },
  { from: "DAC", to: "KTM", airline: "BS", direct: true, image: img("photo-1544735716-392fe2489ffa") },
  { from: "DAC", to: "CCU", airline: "6E", direct: true, image: img("photo-1558431382-27e303142255") },
  { from: "DAC", to: "MLE", airline: "BG", direct: false, image: img("photo-1514282401047-d79a71a590e8") },
  { from: "CGP", to: "DXB", airline: "FZ", direct: true, image: img("photo-1518684079-3c830dcef090") },
  { from: "ZYL", to: "LHR", airline: "BG", direct: true, image: img("photo-1533929736458-ca588d08c8be") },
  { from: "DAC", to: "JFK", airline: "QR", direct: false, image: img("photo-1496442226666-8d4d0e62e6e9") },
  { from: "DAC", to: "DPS", airline: "SQ", direct: false, image: img("photo-1537996194471-e657df975ab4") },
];

/** Curated popular routes with an indicative "from" price and duration. */
export const POPULAR_ROUTES: PopularRoute[] = ROUTE_SEEDS.map((seed) => {
  const from = AIRPORTS_BY_CODE[seed.from];
  const to = AIRPORTS_BY_CODE[seed.to];
  const km = distanceKm(seed.from, seed.to);
  const rng = new SeededRandom(`route:${seed.from}${seed.to}`);
  const aircraft = AIRCRAFT_BY_CODE[rng.pick(fleetFor(seed.airline, km))];
  const airline = AIRLINES_BY_CODE[seed.airline];

  // The advertised "from" price is the cheapest saver economy fare we'd expect
  // to generate on this pair — kept in step with the real fare model so the
  // landing page never promises a price search can't produce.
  const base = baseFareForDistance(km, "economy") * (airline?.lowCost ? 0.84 : 1);
  const fromUsd = Math.round((base + base * 0.17 + 31) * 0.92);

  return {
    fromCode: seed.from,
    toCode: seed.to,
    fromCity: from?.city ?? seed.from,
    toCity: to?.city ?? seed.to,
    fromUsd,
    durationMinutes: Math.round((km / (aircraft?.cruiseKph ?? 830)) * 60) + 25,
    airlineCode: seed.airline,
    image: seed.image,
    direct: seed.direct,
  };
});

/** Deal seeds, each pointing at a curated route with a cabin and discount. */
const DEAL_SEEDS: Array<{
  route: number;
  cabin: CabinClass;
  discountPct: number;
  departOffset: number;
  nights?: number;
  note: string;
}> = [
  { route: 0, cabin: "economy", discountPct: 22, departOffset: 12, nights: 6, note: "Limited seats at this fare" },
  { route: 2, cabin: "economy", discountPct: 18, departOffset: 20, nights: 8, note: "Includes 30 kg baggage" },
  { route: 4, cabin: "business", discountPct: 15, departOffset: 26, nights: 5, note: "Lie-flat seat + lounge" },
  { route: 5, cabin: "economy", discountPct: 25, departOffset: 9, note: "One-way saver fare" },
  { route: 1, cabin: "economy", discountPct: 30, departOffset: 4, nights: 3, note: "Domestic weekend escape" },
  { route: 8, cabin: "premium-economy", discountPct: 12, departOffset: 34, nights: 14, note: "Extra legroom included" },
  { route: 7, cabin: "economy", discountPct: 20, departOffset: 17, nights: 7, note: "Free date change" },
  { route: 11, cabin: "economy", discountPct: 28, departOffset: 23, nights: 5, note: "Island getaway fare" },
];

/** Merchandised fares for the home page and the flights landing rails. */
export const FLIGHT_DEALS: FlightDeal[] = DEAL_SEEDS.map((seed, i) => {
  const route = POPULAR_ROUTES[seed.route];
  const cabinMultiplier =
    seed.cabin === "business" ? 3.1 : seed.cabin === "premium-economy" ? 1.65 : 1;
  const wasUsd = Math.round(route.fromUsd * cabinMultiplier);
  const departDate = addDays(FLIGHT_CALENDAR_ANCHOR, seed.departOffset);

  return {
    id: `deal-${route.fromCode}-${route.toCode}-${i}`,
    fromCode: route.fromCode,
    toCode: route.toCode,
    fromCity: route.fromCity,
    toCity: route.toCity,
    airlineCode: route.airlineCode,
    cabin: seed.cabin,
    fromUsd: Math.round(wasUsd * (1 - seed.discountPct / 100)),
    wasUsd,
    departDate,
    returnDate: seed.nights ? addDays(departDate, seed.nights) : undefined,
    note: seed.note,
    image: route.image,
    discountPct: seed.discountPct,
  };
});

/** Popular routes departing a given airport, for contextual suggestions. */
export function routesFrom(code: string, limit = 6): PopularRoute[] {
  const upper = code.trim().toUpperCase();
  const matches = POPULAR_ROUTES.filter((r) => r.fromCode === upper);
  // Fall back to the headline routes so a rail is never empty.
  return (matches.length ? matches : POPULAR_ROUTES).slice(0, limit);
}

/** Airlines Otithee markets as partners, in display order. */
export const PARTNER_AIRLINE_CODES = [
  "EK",
  "QR",
  "SQ",
  "TK",
  "BG",
  "BS",
  "EY",
  "CX",
  "TG",
  "MH",
  "LH",
  "BA",
];

/**
 * Seasonal campaigns shown on the flights landing page. Static merchandising
 * copy — a CMS would own this in production, which is why it reads as content
 * rather than data.
 */
export const SEASONAL_OFFERS: Array<{
  id: string;
  title: string;
  description: string;
  code: string;
  discountLabel: string;
  expiresOn: string;
  image: string;
}> = [
  {
    id: "season-hajj",
    title: "Hajj & Umrah fares",
    description:
      "Dedicated fares to Jeddah and Madinah with extra baggage and flexible dates for pilgrims.",
    code: "UMRAH10",
    discountLabel: "10% off",
    expiresOn: addDays(FLIGHT_CALENDAR_ANCHOR, 60),
    image: img("photo-1519817650390-64a93db51149"),
  },
  {
    id: "season-winter",
    title: "Winter escape sale",
    description:
      "Beat the chill in Bali, Phuket and the Maldives with fares held until the end of the season.",
    code: "WINTER15",
    discountLabel: "Up to 15% off",
    expiresOn: addDays(FLIGHT_CALENDAR_ANCHOR, 45),
    image: img("photo-1537996194471-e657df975ab4"),
  },
  {
    id: "season-business",
    title: "Business class upgrade week",
    description:
      "Lie-flat seats, lounge access and priority boarding on long-haul routes for less.",
    code: "LIEFLAT",
    discountLabel: "Save $180",
    expiresOn: addDays(FLIGHT_CALENDAR_ANCHOR, 30),
    image: img("photo-1540339832862-474599807836"),
  },
];
