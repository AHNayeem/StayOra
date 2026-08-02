/**
 * Airport reference dataset.
 *
 * Hand-authored (not generated) because codes, cities and timezones must be
 * *correct* — the whole flight module derives durations and local times from
 * `utcOffsetMinutes`, so a wrong offset produces impossible itineraries. Offsets
 * are the airport's standard (non-DST) offset, which is what a mock dataset can
 * honestly model; a real integration reads them from the timezone database.
 *
 * Weighted toward Bangladesh, the Gulf, South/South-East Asia and the long-haul
 * routes Otithee actually sells, with enough European and North American
 * coverage for believable multi-city itineraries.
 */

import type { Airport } from "@/types/flight";

/** Terminal label sets, shared to keep the table readable. */
const T1 = ["T1"];
const T12 = ["T1", "T2"];
const T123 = ["T1", "T2", "T3"];
const T1234 = ["T1", "T2", "T3", "T4"];
const AB = ["Terminal A", "Terminal B"];

export const AIRPORTS: Airport[] = [
  // ---- Bangladesh -----------------------------------------------------------
  {
    code: "DAC",
    name: "Hazrat Shahjalal International",
    city: "Dhaka",
    country: "Bangladesh",
    countryCode: "BD",
    timezone: "Asia/Dhaka",
    utcOffsetMinutes: 360,
    terminals: T123,
    popular: true,
  },
  {
    code: "CGP",
    name: "Shah Amanat International",
    city: "Chattogram",
    country: "Bangladesh",
    countryCode: "BD",
    timezone: "Asia/Dhaka",
    utcOffsetMinutes: 360,
    terminals: T12,
    popular: true,
  },
  {
    code: "ZYL",
    name: "Osmani International",
    city: "Sylhet",
    country: "Bangladesh",
    countryCode: "BD",
    timezone: "Asia/Dhaka",
    utcOffsetMinutes: 360,
    terminals: T1,
  },
  {
    code: "CXB",
    name: "Cox's Bazar",
    city: "Cox's Bazar",
    country: "Bangladesh",
    countryCode: "BD",
    timezone: "Asia/Dhaka",
    utcOffsetMinutes: 360,
    terminals: T1,
    popular: true,
  },
  {
    code: "JSR",
    name: "Jashore",
    city: "Jashore",
    country: "Bangladesh",
    countryCode: "BD",
    timezone: "Asia/Dhaka",
    utcOffsetMinutes: 360,
    terminals: T1,
  },
  {
    code: "SPD",
    name: "Saidpur",
    city: "Saidpur",
    country: "Bangladesh",
    countryCode: "BD",
    timezone: "Asia/Dhaka",
    utcOffsetMinutes: 360,
    terminals: T1,
  },
  {
    code: "BZL",
    name: "Barishal",
    city: "Barishal",
    country: "Bangladesh",
    countryCode: "BD",
    timezone: "Asia/Dhaka",
    utcOffsetMinutes: 360,
    terminals: T1,
  },

  // ---- Gulf & Middle East ---------------------------------------------------
  {
    code: "DXB",
    name: "Dubai International",
    city: "Dubai",
    country: "United Arab Emirates",
    countryCode: "AE",
    timezone: "Asia/Dubai",
    utcOffsetMinutes: 240,
    terminals: T123,
    popular: true,
    nearby: ["SHJ", "AUH", "DWC"],
  },
  {
    code: "DWC",
    name: "Al Maktoum International",
    city: "Dubai",
    country: "United Arab Emirates",
    countryCode: "AE",
    timezone: "Asia/Dubai",
    utcOffsetMinutes: 240,
    terminals: T1,
    nearby: ["DXB", "SHJ"],
  },
  {
    code: "SHJ",
    name: "Sharjah International",
    city: "Sharjah",
    country: "United Arab Emirates",
    countryCode: "AE",
    timezone: "Asia/Dubai",
    utcOffsetMinutes: 240,
    terminals: T1,
    nearby: ["DXB", "DWC"],
  },
  {
    code: "AUH",
    name: "Zayed International",
    city: "Abu Dhabi",
    country: "United Arab Emirates",
    countryCode: "AE",
    timezone: "Asia/Dubai",
    utcOffsetMinutes: 240,
    terminals: ["Terminal A"],
    popular: true,
    nearby: ["DXB"],
  },
  {
    code: "DOH",
    name: "Hamad International",
    city: "Doha",
    country: "Qatar",
    countryCode: "QA",
    timezone: "Asia/Qatar",
    utcOffsetMinutes: 180,
    terminals: ["Main Terminal"],
    popular: true,
  },
  {
    code: "RUH",
    name: "King Khalid International",
    city: "Riyadh",
    country: "Saudi Arabia",
    countryCode: "SA",
    timezone: "Asia/Riyadh",
    utcOffsetMinutes: 180,
    terminals: T1234,
  },
  {
    code: "JED",
    name: "King Abdulaziz International",
    city: "Jeddah",
    country: "Saudi Arabia",
    countryCode: "SA",
    timezone: "Asia/Riyadh",
    utcOffsetMinutes: 180,
    terminals: T123,
    popular: true,
  },
  {
    code: "MCT",
    name: "Muscat International",
    city: "Muscat",
    country: "Oman",
    countryCode: "OM",
    timezone: "Asia/Muscat",
    utcOffsetMinutes: 240,
    terminals: T1,
  },
  {
    code: "KWI",
    name: "Kuwait International",
    city: "Kuwait City",
    country: "Kuwait",
    countryCode: "KW",
    timezone: "Asia/Kuwait",
    utcOffsetMinutes: 180,
    terminals: T1234,
  },
  {
    code: "BAH",
    name: "Bahrain International",
    city: "Manama",
    country: "Bahrain",
    countryCode: "BH",
    timezone: "Asia/Bahrain",
    utcOffsetMinutes: 180,
    terminals: T1,
  },

  // ---- South Asia -----------------------------------------------------------
  {
    code: "CCU",
    name: "Netaji Subhas Chandra Bose International",
    city: "Kolkata",
    country: "India",
    countryCode: "IN",
    timezone: "Asia/Kolkata",
    utcOffsetMinutes: 330,
    terminals: T12,
    popular: true,
  },
  {
    code: "DEL",
    name: "Indira Gandhi International",
    city: "Delhi",
    country: "India",
    countryCode: "IN",
    timezone: "Asia/Kolkata",
    utcOffsetMinutes: 330,
    terminals: T123,
    popular: true,
  },
  {
    code: "BOM",
    name: "Chhatrapati Shivaji Maharaj International",
    city: "Mumbai",
    country: "India",
    countryCode: "IN",
    timezone: "Asia/Kolkata",
    utcOffsetMinutes: 330,
    terminals: T12,
    popular: true,
  },
  {
    code: "MAA",
    name: "Chennai International",
    city: "Chennai",
    country: "India",
    countryCode: "IN",
    timezone: "Asia/Kolkata",
    utcOffsetMinutes: 330,
    terminals: T1234,
  },
  {
    code: "BLR",
    name: "Kempegowda International",
    city: "Bengaluru",
    country: "India",
    countryCode: "IN",
    timezone: "Asia/Kolkata",
    utcOffsetMinutes: 330,
    terminals: T12,
  },
  {
    code: "KTM",
    name: "Tribhuvan International",
    city: "Kathmandu",
    country: "Nepal",
    countryCode: "NP",
    timezone: "Asia/Kathmandu",
    utcOffsetMinutes: 345,
    terminals: T12,
    popular: true,
  },
  {
    code: "CMB",
    name: "Bandaranaike International",
    city: "Colombo",
    country: "Sri Lanka",
    countryCode: "LK",
    timezone: "Asia/Colombo",
    utcOffsetMinutes: 330,
    terminals: T12,
  },
  {
    code: "MLE",
    name: "Velana International",
    city: "Malé",
    country: "Maldives",
    countryCode: "MV",
    timezone: "Indian/Maldives",
    utcOffsetMinutes: 300,
    terminals: T12,
    popular: true,
  },
  {
    code: "KHI",
    name: "Jinnah International",
    city: "Karachi",
    country: "Pakistan",
    countryCode: "PK",
    timezone: "Asia/Karachi",
    utcOffsetMinutes: 300,
    terminals: T1,
  },
  {
    code: "ISB",
    name: "Islamabad International",
    city: "Islamabad",
    country: "Pakistan",
    countryCode: "PK",
    timezone: "Asia/Karachi",
    utcOffsetMinutes: 300,
    terminals: T1,
  },

  // ---- South-East & East Asia ----------------------------------------------
  {
    code: "BKK",
    name: "Suvarnabhumi",
    city: "Bangkok",
    country: "Thailand",
    countryCode: "TH",
    timezone: "Asia/Bangkok",
    utcOffsetMinutes: 420,
    terminals: T12,
    popular: true,
    nearby: ["DMK"],
  },
  {
    code: "DMK",
    name: "Don Mueang International",
    city: "Bangkok",
    country: "Thailand",
    countryCode: "TH",
    timezone: "Asia/Bangkok",
    utcOffsetMinutes: 420,
    terminals: T12,
    nearby: ["BKK"],
  },
  {
    code: "HKT",
    name: "Phuket International",
    city: "Phuket",
    country: "Thailand",
    countryCode: "TH",
    timezone: "Asia/Bangkok",
    utcOffsetMinutes: 420,
    terminals: T12,
  },
  {
    code: "SIN",
    name: "Changi",
    city: "Singapore",
    country: "Singapore",
    countryCode: "SG",
    timezone: "Asia/Singapore",
    utcOffsetMinutes: 480,
    terminals: T1234,
    popular: true,
  },
  {
    code: "KUL",
    name: "Kuala Lumpur International",
    city: "Kuala Lumpur",
    country: "Malaysia",
    countryCode: "MY",
    timezone: "Asia/Kuala_Lumpur",
    utcOffsetMinutes: 480,
    terminals: ["KLIA1", "KLIA2"],
    popular: true,
  },
  {
    code: "CGK",
    name: "Soekarno–Hatta International",
    city: "Jakarta",
    country: "Indonesia",
    countryCode: "ID",
    timezone: "Asia/Jakarta",
    utcOffsetMinutes: 420,
    terminals: T123,
  },
  {
    code: "DPS",
    name: "Ngurah Rai International",
    city: "Denpasar (Bali)",
    country: "Indonesia",
    countryCode: "ID",
    timezone: "Asia/Makassar",
    utcOffsetMinutes: 480,
    terminals: T12,
    popular: true,
  },
  {
    code: "HKG",
    name: "Hong Kong International",
    city: "Hong Kong",
    country: "Hong Kong SAR",
    countryCode: "HK",
    timezone: "Asia/Hong_Kong",
    utcOffsetMinutes: 480,
    terminals: T12,
    popular: true,
  },
  {
    code: "NRT",
    name: "Narita International",
    city: "Tokyo",
    country: "Japan",
    countryCode: "JP",
    timezone: "Asia/Tokyo",
    utcOffsetMinutes: 540,
    terminals: T123,
    popular: true,
    nearby: ["HND"],
  },
  {
    code: "HND",
    name: "Haneda",
    city: "Tokyo",
    country: "Japan",
    countryCode: "JP",
    timezone: "Asia/Tokyo",
    utcOffsetMinutes: 540,
    terminals: T123,
    nearby: ["NRT"],
  },
  {
    code: "ICN",
    name: "Incheon International",
    city: "Seoul",
    country: "South Korea",
    countryCode: "KR",
    timezone: "Asia/Seoul",
    utcOffsetMinutes: 540,
    terminals: T12,
  },
  {
    code: "PVG",
    name: "Pudong International",
    city: "Shanghai",
    country: "China",
    countryCode: "CN",
    timezone: "Asia/Shanghai",
    utcOffsetMinutes: 480,
    terminals: T12,
  },
  {
    code: "PEK",
    name: "Capital International",
    city: "Beijing",
    country: "China",
    countryCode: "CN",
    timezone: "Asia/Shanghai",
    utcOffsetMinutes: 480,
    terminals: T123,
    nearby: ["PKX"],
  },
  {
    code: "PKX",
    name: "Daxing International",
    city: "Beijing",
    country: "China",
    countryCode: "CN",
    timezone: "Asia/Shanghai",
    utcOffsetMinutes: 480,
    terminals: T1,
    nearby: ["PEK"],
  },
  {
    code: "MNL",
    name: "Ninoy Aquino International",
    city: "Manila",
    country: "Philippines",
    countryCode: "PH",
    timezone: "Asia/Manila",
    utcOffsetMinutes: 480,
    terminals: T1234,
  },

  // ---- Europe ---------------------------------------------------------------
  {
    code: "IST",
    name: "Istanbul Airport",
    city: "Istanbul",
    country: "Türkiye",
    countryCode: "TR",
    timezone: "Europe/Istanbul",
    utcOffsetMinutes: 180,
    terminals: ["Main Terminal"],
    popular: true,
    nearby: ["SAW"],
  },
  {
    code: "SAW",
    name: "Sabiha Gökçen International",
    city: "Istanbul",
    country: "Türkiye",
    countryCode: "TR",
    timezone: "Europe/Istanbul",
    utcOffsetMinutes: 180,
    terminals: T12,
    nearby: ["IST"],
  },
  {
    code: "LHR",
    name: "Heathrow",
    city: "London",
    country: "United Kingdom",
    countryCode: "GB",
    timezone: "Europe/London",
    utcOffsetMinutes: 0,
    terminals: ["T2", "T3", "T4", "T5"],
    popular: true,
    nearby: ["LGW", "STN", "LCY"],
  },
  {
    code: "LGW",
    name: "Gatwick",
    city: "London",
    country: "United Kingdom",
    countryCode: "GB",
    timezone: "Europe/London",
    utcOffsetMinutes: 0,
    terminals: ["North", "South"],
    nearby: ["LHR", "STN"],
  },
  {
    code: "STN",
    name: "Stansted",
    city: "London",
    country: "United Kingdom",
    countryCode: "GB",
    timezone: "Europe/London",
    utcOffsetMinutes: 0,
    terminals: T1,
    nearby: ["LHR", "LGW"],
  },
  {
    code: "MAN",
    name: "Manchester",
    city: "Manchester",
    country: "United Kingdom",
    countryCode: "GB",
    timezone: "Europe/London",
    utcOffsetMinutes: 0,
    terminals: T123,
  },
  {
    code: "CDG",
    name: "Charles de Gaulle",
    city: "Paris",
    country: "France",
    countryCode: "FR",
    timezone: "Europe/Paris",
    utcOffsetMinutes: 60,
    terminals: T123,
    popular: true,
    nearby: ["ORY"],
  },
  {
    code: "ORY",
    name: "Orly",
    city: "Paris",
    country: "France",
    countryCode: "FR",
    timezone: "Europe/Paris",
    utcOffsetMinutes: 60,
    terminals: ["Orly 1", "Orly 3", "Orly 4"],
    nearby: ["CDG"],
  },
  {
    code: "AMS",
    name: "Schiphol",
    city: "Amsterdam",
    country: "Netherlands",
    countryCode: "NL",
    timezone: "Europe/Amsterdam",
    utcOffsetMinutes: 60,
    terminals: T123,
    popular: true,
  },
  {
    code: "FRA",
    name: "Frankfurt",
    city: "Frankfurt",
    country: "Germany",
    countryCode: "DE",
    timezone: "Europe/Berlin",
    utcOffsetMinutes: 60,
    terminals: T12,
    popular: true,
  },
  {
    code: "MUC",
    name: "Munich",
    city: "Munich",
    country: "Germany",
    countryCode: "DE",
    timezone: "Europe/Berlin",
    utcOffsetMinutes: 60,
    terminals: T12,
  },
  {
    code: "FCO",
    name: "Leonardo da Vinci–Fiumicino",
    city: "Rome",
    country: "Italy",
    countryCode: "IT",
    timezone: "Europe/Rome",
    utcOffsetMinutes: 60,
    terminals: T123,
  },
  {
    code: "BCN",
    name: "Josep Tarradellas Barcelona–El Prat",
    city: "Barcelona",
    country: "Spain",
    countryCode: "ES",
    timezone: "Europe/Madrid",
    utcOffsetMinutes: 60,
    terminals: T12,
  },
  {
    code: "ATH",
    name: "Eleftherios Venizelos",
    city: "Athens",
    country: "Greece",
    countryCode: "GR",
    timezone: "Europe/Athens",
    utcOffsetMinutes: 120,
    terminals: T1,
  },

  // ---- North America & Oceania ---------------------------------------------
  {
    code: "JFK",
    name: "John F. Kennedy International",
    city: "New York",
    country: "United States",
    countryCode: "US",
    timezone: "America/New_York",
    utcOffsetMinutes: -300,
    terminals: T1234,
    popular: true,
    nearby: ["EWR", "LGA"],
  },
  {
    code: "EWR",
    name: "Newark Liberty International",
    city: "New York",
    country: "United States",
    countryCode: "US",
    timezone: "America/New_York",
    utcOffsetMinutes: -300,
    terminals: AB,
    nearby: ["JFK", "LGA"],
  },
  {
    code: "LGA",
    name: "LaGuardia",
    city: "New York",
    country: "United States",
    countryCode: "US",
    timezone: "America/New_York",
    utcOffsetMinutes: -300,
    terminals: AB,
    nearby: ["JFK", "EWR"],
  },
  {
    code: "LAX",
    name: "Los Angeles International",
    city: "Los Angeles",
    country: "United States",
    countryCode: "US",
    timezone: "America/Los_Angeles",
    utcOffsetMinutes: -480,
    terminals: T1234,
  },
  {
    code: "YYZ",
    name: "Toronto Pearson International",
    city: "Toronto",
    country: "Canada",
    countryCode: "CA",
    timezone: "America/Toronto",
    utcOffsetMinutes: -300,
    terminals: T123,
  },
  {
    code: "SYD",
    name: "Kingsford Smith",
    city: "Sydney",
    country: "Australia",
    countryCode: "AU",
    timezone: "Australia/Sydney",
    utcOffsetMinutes: 600,
    terminals: T123,
  },
  {
    code: "MEL",
    name: "Melbourne",
    city: "Melbourne",
    country: "Australia",
    countryCode: "AU",
    timezone: "Australia/Melbourne",
    utcOffsetMinutes: 600,
    terminals: T1234,
  },
];

/** Airport lookup by IATA code — the map every derivation reads. */
export const AIRPORTS_BY_CODE: Record<string, Airport> = Object.fromEntries(
  AIRPORTS.map((a) => [a.code, a]),
);

/** Resolve an airport, or `undefined` for an unknown code. */
export function findAirport(code: string): Airport | undefined {
  return AIRPORTS_BY_CODE[code.trim().toUpperCase()];
}

/** Airports shown before the traveller types anything. */
export const POPULAR_AIRPORTS: Airport[] = AIRPORTS.filter((a) => a.popular);

/**
 * Great-circle-ish distance between two airports in km.
 *
 * The dataset carries no lat/lon (it would be one more thing to get wrong), so
 * distance is derived from a small table of region centroids keyed by country.
 * It only needs to be *monotonic and plausible* — it feeds duration, price and
 * CO₂ estimates, none of which claim to be exact.
 */
const REGION_CENTROIDS: Record<string, [number, number]> = {
  BD: [23.8, 90.4],
  IN: [22.0, 78.0],
  NP: [27.7, 85.3],
  LK: [7.0, 80.7],
  MV: [4.2, 73.5],
  PK: [27.0, 68.0],
  AE: [24.5, 54.5],
  QA: [25.3, 51.5],
  SA: [23.9, 45.1],
  OM: [21.5, 57.0],
  KW: [29.3, 47.9],
  BH: [26.1, 50.6],
  TH: [14.0, 101.0],
  SG: [1.35, 103.8],
  MY: [4.2, 102.0],
  ID: [-4.0, 110.0],
  HK: [22.3, 114.2],
  JP: [36.0, 138.0],
  KR: [36.5, 127.8],
  CN: [35.0, 105.0],
  PH: [13.0, 122.0],
  TR: [39.0, 35.0],
  GB: [54.0, -2.0],
  FR: [46.5, 2.5],
  NL: [52.2, 5.5],
  DE: [51.0, 10.0],
  IT: [42.8, 12.5],
  ES: [40.0, -4.0],
  GR: [39.0, 22.0],
  US: [39.0, -98.0],
  CA: [56.0, -96.0],
  AU: [-25.0, 134.0],
};

/** Per-airport nudge so two airports in one country aren't zero km apart. */
function jitter(code: string): [number, number] {
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) >>> 0;
  return [((h % 200) - 100) / 40, (((h >> 8) % 200) - 100) / 30];
}

function coords(airport: Airport): [number, number] {
  const base = REGION_CENTROIDS[airport.countryCode] ?? [0, 0];
  const [dLat, dLon] = jitter(airport.code);
  return [base[0] + dLat, base[1] + dLon];
}

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Haversine distance in km between two airports (rounded to 10 km). */
export function distanceKm(fromCode: string, toCode: string): number {
  const from = AIRPORTS_BY_CODE[fromCode];
  const to = AIRPORTS_BY_CODE[toCode];
  if (!from || !to) return 0;
  const [lat1, lon1] = coords(from);
  const [lat2, lon2] = coords(to);
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const km = 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
  // Floor at 250 km so same-country hops still price and time sensibly.
  return Math.round(Math.max(250, km) / 10) * 10;
}

/**
 * Airports serving the same city region as `code`, including itself. Powers the
 * "include nearby airports" search option.
 */
export function nearbyCodes(code: string): string[] {
  const airport = AIRPORTS_BY_CODE[code];
  if (!airport) return [code];
  return [code, ...(airport.nearby ?? [])];
}

/** `"Dhaka (DAC)"` — the label used across chips, summaries and tickets. */
export function airportLabel(code: string): string {
  const airport = AIRPORTS_BY_CODE[code];
  return airport ? `${airport.city} (${airport.code})` : code;
}
