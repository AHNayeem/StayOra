/**
 * Airline + aircraft reference datasets.
 *
 * Hand-authored for the same reason as the airport table: IATA designators,
 * alliances and hubs have to be right or every derived itinerary reads as fake.
 * Ratings, on-time percentages and fleet sizes are illustrative demo figures.
 *
 * Logos are *generated*, not fetched: each carrier carries a `brandColor` and
 * the shared `<AirlineLogo>` renders a rounded mark with the IATA code on it.
 * That keeps the module free of third-party image rights and offline-safe,
 * while giving every airline a distinct, recognisable identity in the results.
 */

import type { Aircraft, Airline } from "@/types/flight";

export const AIRLINES: Airline[] = [
  {
    code: "BG",
    name: "Biman Bangladesh Airlines",
    country: "Bangladesh",
    countryCode: "BD",
    alliance: "None",
    brandColor: "#0d6b3f",
    logoTextColor: "#ffffff",
    rating: 3.8,
    onTimePct: 76,
    fleetSize: 21,
    hubs: ["DAC", "CGP"],
    networkRadiusKm: 14000,
    lowCost: false,
  },
  {
    code: "BS",
    name: "US-Bangla Airlines",
    country: "Bangladesh",
    countryCode: "BD",
    alliance: "None",
    brandColor: "#1a4f9c",
    logoTextColor: "#ffffff",
    rating: 4.0,
    onTimePct: 84,
    fleetSize: 24,
    hubs: ["DAC", "CGP", "ZYL"],
    networkRadiusKm: 5200,
    lowCost: true,
  },
  {
    code: "VQ",
    name: "Novoair",
    country: "Bangladesh",
    countryCode: "BD",
    alliance: "None",
    brandColor: "#e4572e",
    logoTextColor: "#ffffff",
    rating: 4.1,
    onTimePct: 88,
    fleetSize: 8,
    hubs: ["DAC"],
    networkRadiusKm: 1600,
    lowCost: true,
  },
  {
    code: "EK",
    name: "Emirates",
    country: "United Arab Emirates",
    countryCode: "AE",
    alliance: "None",
    brandColor: "#d71921",
    logoTextColor: "#ffffff",
    rating: 4.7,
    onTimePct: 87,
    fleetSize: 260,
    hubs: ["DXB"],
    networkRadiusKm: 15000,
    lowCost: false,
  },
  {
    code: "QR",
    name: "Qatar Airways",
    country: "Qatar",
    countryCode: "QA",
    alliance: "Oneworld",
    brandColor: "#5c0632",
    logoTextColor: "#ffffff",
    rating: 4.8,
    onTimePct: 89,
    fleetSize: 233,
    hubs: ["DOH"],
    networkRadiusKm: 15000,
    lowCost: false,
  },
  {
    code: "SQ",
    name: "Singapore Airlines",
    country: "Singapore",
    countryCode: "SG",
    alliance: "Star Alliance",
    brandColor: "#f5a623",
    logoTextColor: "#1c2540",
    rating: 4.9,
    onTimePct: 91,
    fleetSize: 152,
    hubs: ["SIN"],
    networkRadiusKm: 15000,
    lowCost: false,
  },
  {
    code: "TK",
    name: "Turkish Airlines",
    country: "Türkiye",
    countryCode: "TR",
    alliance: "Star Alliance",
    brandColor: "#c70a0c",
    logoTextColor: "#ffffff",
    rating: 4.5,
    onTimePct: 82,
    fleetSize: 372,
    hubs: ["IST"],
    networkRadiusKm: 15000,
    lowCost: false,
  },
  {
    code: "EY",
    name: "Etihad Airways",
    country: "United Arab Emirates",
    countryCode: "AE",
    alliance: "None",
    brandColor: "#b8860b",
    logoTextColor: "#ffffff",
    rating: 4.5,
    onTimePct: 86,
    fleetSize: 92,
    hubs: ["AUH"],
    networkRadiusKm: 15000,
    lowCost: false,
  },
  {
    code: "G9",
    name: "Air Arabia",
    country: "United Arab Emirates",
    countryCode: "AE",
    alliance: "None",
    brandColor: "#e2231a",
    logoTextColor: "#ffffff",
    rating: 3.9,
    onTimePct: 85,
    fleetSize: 71,
    hubs: ["SHJ"],
    networkRadiusKm: 5000,
    lowCost: true,
  },
  {
    code: "FZ",
    name: "FlyDubai",
    country: "United Arab Emirates",
    countryCode: "AE",
    alliance: "None",
    brandColor: "#004a97",
    logoTextColor: "#ffffff",
    rating: 4.0,
    onTimePct: 83,
    fleetSize: 87,
    hubs: ["DXB"],
    networkRadiusKm: 5200,
    lowCost: true,
  },
  {
    code: "CX",
    name: "Cathay Pacific",
    country: "Hong Kong SAR",
    countryCode: "HK",
    alliance: "Oneworld",
    brandColor: "#005b48",
    logoTextColor: "#ffffff",
    rating: 4.6,
    onTimePct: 88,
    fleetSize: 179,
    hubs: ["HKG"],
    networkRadiusKm: 14000,
    lowCost: false,
  },
  {
    code: "TG",
    name: "Thai Airways",
    country: "Thailand",
    countryCode: "TH",
    alliance: "Star Alliance",
    brandColor: "#4b1f74",
    logoTextColor: "#ffffff",
    rating: 4.3,
    onTimePct: 80,
    fleetSize: 76,
    hubs: ["BKK"],
    networkRadiusKm: 12000,
    lowCost: false,
  },
  {
    code: "MH",
    name: "Malaysia Airlines",
    country: "Malaysia",
    countryCode: "MY",
    alliance: "Oneworld",
    brandColor: "#00539f",
    logoTextColor: "#ffffff",
    rating: 4.2,
    onTimePct: 81,
    fleetSize: 82,
    hubs: ["KUL"],
    networkRadiusKm: 13000,
    lowCost: false,
  },
  {
    code: "6E",
    name: "IndiGo",
    country: "India",
    countryCode: "IN",
    alliance: "None",
    brandColor: "#04226b",
    logoTextColor: "#ffffff",
    rating: 4.1,
    onTimePct: 87,
    fleetSize: 358,
    hubs: ["DEL", "BOM", "CCU"],
    networkRadiusKm: 6500,
    lowCost: true,
  },
  {
    code: "AI",
    name: "Air India",
    country: "India",
    countryCode: "IN",
    alliance: "Star Alliance",
    brandColor: "#c8102e",
    logoTextColor: "#ffffff",
    rating: 4.0,
    onTimePct: 78,
    fleetSize: 187,
    hubs: ["DEL", "BOM"],
    networkRadiusKm: 14000,
    lowCost: false,
  },
  {
    code: "LH",
    name: "Lufthansa",
    country: "Germany",
    countryCode: "DE",
    alliance: "Star Alliance",
    brandColor: "#05164d",
    logoTextColor: "#f9ba00",
    rating: 4.4,
    onTimePct: 79,
    fleetSize: 291,
    hubs: ["FRA", "MUC"],
    networkRadiusKm: 15000,
    lowCost: false,
  },
  {
    code: "BA",
    name: "British Airways",
    country: "United Kingdom",
    countryCode: "GB",
    alliance: "Oneworld",
    brandColor: "#075aaa",
    logoTextColor: "#ffffff",
    rating: 4.2,
    onTimePct: 77,
    fleetSize: 254,
    hubs: ["LHR", "LGW"],
    networkRadiusKm: 15000,
    lowCost: false,
  },
  {
    code: "KL",
    name: "KLM Royal Dutch Airlines",
    country: "Netherlands",
    countryCode: "NL",
    alliance: "SkyTeam",
    brandColor: "#00a1de",
    logoTextColor: "#ffffff",
    rating: 4.4,
    onTimePct: 83,
    fleetSize: 116,
    hubs: ["AMS"],
    networkRadiusKm: 15000,
    lowCost: false,
  },
  {
    code: "AF",
    name: "Air France",
    country: "France",
    countryCode: "FR",
    alliance: "SkyTeam",
    brandColor: "#002157",
    logoTextColor: "#ffffff",
    rating: 4.3,
    onTimePct: 80,
    fleetSize: 213,
    hubs: ["CDG", "ORY"],
    networkRadiusKm: 15000,
    lowCost: false,
  },
  {
    code: "SV",
    name: "Saudia",
    country: "Saudi Arabia",
    countryCode: "SA",
    alliance: "SkyTeam",
    brandColor: "#00694e",
    logoTextColor: "#ffffff",
    rating: 4.1,
    onTimePct: 81,
    fleetSize: 144,
    hubs: ["JED", "RUH"],
    networkRadiusKm: 14000,
    lowCost: false,
  },
];

/** Airline lookup by IATA designator. */
export const AIRLINES_BY_CODE: Record<string, Airline> = Object.fromEntries(
  AIRLINES.map((a) => [a.code, a]),
);

/** Resolve an airline, or `undefined` for an unknown designator. */
export function findAirline(code: string): Airline | undefined {
  return AIRLINES_BY_CODE[code.trim().toUpperCase()];
}

/** Display name for an airline code, falling back to the code itself. */
export function airlineName(code: string): string {
  return AIRLINES_BY_CODE[code]?.name ?? code;
}

/* -------------------------------------------------------------------------- */
/* Aircraft                                                                    */
/* -------------------------------------------------------------------------- */

export const AIRCRAFT: Aircraft[] = [
  {
    code: "788",
    name: "Boeing 787-8 Dreamliner",
    cruiseKph: 900,
    rangeKm: 13500,
    wideBody: true,
    seatPitchInches: 32,
    hasWifi: true,
    hasEntertainment: true,
    hasPower: true,
  },
  {
    code: "789",
    name: "Boeing 787-9 Dreamliner",
    cruiseKph: 903,
    rangeKm: 14100,
    wideBody: true,
    seatPitchInches: 32,
    hasWifi: true,
    hasEntertainment: true,
    hasPower: true,
  },
  {
    code: "77W",
    name: "Boeing 777-300ER",
    cruiseKph: 905,
    rangeKm: 13600,
    wideBody: true,
    seatPitchInches: 33,
    hasWifi: true,
    hasEntertainment: true,
    hasPower: true,
  },
  {
    code: "388",
    name: "Airbus A380-800",
    cruiseKph: 903,
    rangeKm: 15200,
    wideBody: true,
    seatPitchInches: 34,
    hasWifi: true,
    hasEntertainment: true,
    hasPower: true,
  },
  {
    code: "359",
    name: "Airbus A350-900",
    cruiseKph: 903,
    rangeKm: 15000,
    wideBody: true,
    seatPitchInches: 33,
    hasWifi: true,
    hasEntertainment: true,
    hasPower: true,
  },
  {
    code: "333",
    name: "Airbus A330-300",
    cruiseKph: 871,
    rangeKm: 11700,
    wideBody: true,
    seatPitchInches: 32,
    hasWifi: true,
    hasEntertainment: true,
    hasPower: true,
  },
  {
    code: "32N",
    name: "Airbus A320neo",
    cruiseKph: 833,
    rangeKm: 6300,
    wideBody: false,
    seatPitchInches: 30,
    hasWifi: true,
    hasEntertainment: false,
    hasPower: true,
  },
  {
    code: "321",
    name: "Airbus A321",
    cruiseKph: 830,
    rangeKm: 5900,
    wideBody: false,
    seatPitchInches: 30,
    hasWifi: true,
    hasEntertainment: false,
    hasPower: true,
  },
  {
    code: "738",
    name: "Boeing 737-800",
    cruiseKph: 842,
    rangeKm: 5400,
    wideBody: false,
    seatPitchInches: 30,
    hasWifi: false,
    hasEntertainment: false,
    hasPower: false,
  },
  {
    code: "73J",
    name: "Boeing 737 MAX 8",
    cruiseKph: 839,
    rangeKm: 6500,
    wideBody: false,
    seatPitchInches: 31,
    hasWifi: true,
    hasEntertainment: false,
    hasPower: true,
  },
  {
    code: "AT7",
    name: "ATR 72-600",
    cruiseKph: 510,
    rangeKm: 1500,
    wideBody: false,
    seatPitchInches: 29,
    hasWifi: false,
    hasEntertainment: false,
    hasPower: false,
  },
  {
    code: "E90",
    name: "Embraer E190",
    cruiseKph: 829,
    rangeKm: 4500,
    wideBody: false,
    seatPitchInches: 31,
    hasWifi: false,
    hasEntertainment: false,
    hasPower: true,
  },
];

export const AIRCRAFT_BY_CODE: Record<string, Aircraft> = Object.fromEntries(
  AIRCRAFT.map((a) => [a.code, a]),
);

export function findAircraft(code: string): Aircraft | undefined {
  return AIRCRAFT_BY_CODE[code];
}

/**
 * Which aircraft each carrier flies, by range band. The generator picks from
 * `short` for regional hops and `long` for anything over ~3,500 km, so a 45-min
 * DAC→CGP hop never gets an A380 and a DAC→LHR never gets an ATR 72.
 */
export const FLEET: Record<string, { short: string[]; long: string[] }> = {
  BG: { short: ["73J", "738"], long: ["788", "789", "77W"] },
  BS: { short: ["738", "AT7"], long: ["73J"] },
  VQ: { short: ["AT7", "E90"], long: ["E90"] },
  EK: { short: ["77W"], long: ["388", "77W", "359"] },
  QR: { short: ["32N", "321"], long: ["359", "77W", "789"] },
  SQ: { short: ["32N"], long: ["359", "77W", "788"] },
  TK: { short: ["32N", "321"], long: ["333", "789", "77W"] },
  EY: { short: ["32N"], long: ["789", "359", "77W"] },
  G9: { short: ["32N", "321"], long: ["321"] },
  FZ: { short: ["73J", "738"], long: ["73J"] },
  CX: { short: ["333"], long: ["77W", "359"] },
  TG: { short: ["32N", "321"], long: ["77W", "359", "788"] },
  MH: { short: ["738", "32N"], long: ["333", "789"] },
  "6E": { short: ["32N", "321", "AT7"], long: ["321"] },
  AI: { short: ["32N", "321"], long: ["788", "77W"] },
  LH: { short: ["32N", "321"], long: ["359", "77W", "388"] },
  BA: { short: ["321", "32N"], long: ["788", "77W", "388"] },
  KL: { short: ["73J", "738"], long: ["789", "77W"] },
  AF: { short: ["32N", "321"], long: ["359", "77W"] },
  SV: { short: ["32N", "738"], long: ["789", "77W", "333"] },
};

/** Fuel-reserve margin: a type is only assigned to a sector it comfortably makes. */
const RANGE_MARGIN = 1.08;

/**
 * Aircraft `airlineCode` can operate on a sector of `distanceKm`.
 *
 * Returns an **empty array** when nothing in the fleet has the range, and
 * callers must treat that as "this carrier cannot fly this sector" rather than
 * substituting a default. That's what stops an ATR 72 being rostered across the
 * Bay of Bengal.
 */
export function fleetFor(airlineCode: string, distanceKm: number): string[] {
  const fleet = FLEET[airlineCode];
  if (!fleet) return [];
  const candidates = distanceKm > 3500 ? fleet.long : [...fleet.short, ...fleet.long];
  return candidates.filter((code) => {
    const aircraft = AIRCRAFT_BY_CODE[code];
    return aircraft && aircraft.rangeKm >= distanceKm * RANGE_MARGIN;
  });
}

/**
 * Airlines that plausibly serve a city pair.
 *
 * Three conditions, all necessary:
 *
 *  1. **Network reach.** The pair has to sit inside the carrier's
 *     `networkRadiusKm`. Without this, every airline based at the origin turns
 *     up on every search — which is how a domestic ATR operator ends up quoted
 *     for Dhaka → New York.
 *  2. **A way to fly it.** Either the carrier is hubbed at an endpoint (it can
 *     fly the sector directly) or it is full-service (it can connect via its own
 *     hub). Low-cost carriers don't sell connections they don't touch.
 *  3. **Fleet range** for the direct sector, or for a hub connection — checked
 *     per-routing in the generator, since a carrier may be unable to fly a pair
 *     non-stop yet perfectly able to connect it.
 */
export function carriersFor(fromCode: string, toCode: string, directKm: number): Airline[] {
  const endpoints = new Set([fromCode, toCode]);
  return AIRLINES.filter((airline) => {
    if (directKm > airline.networkRadiusKm) return false;
    const touches = airline.hubs.some((hub) => endpoints.has(hub));
    return touches || !airline.lowCost;
  });
}
