/**
 * Deterministic listing factory — expands the curated seed listings up to the
 * volumes StayOra ships with (50+ hotels, 80+ activities, …). Everything is
 * seeded ({@link SeededRandom}) so the server and client build byte-identical
 * catalogs; nothing here reads the wall clock or `Math.random`.
 *
 * Images reuse the pool of known-good Unsplash IDs already used by the curated
 * seeds, so generated cards never render a broken image. Consumed only through
 * {@link "@/constants/listings"} → the catalog service, so the UI is unaware
 * these items are synthetic.
 */

import type {
  Activity,
  Apartment,
  ConventionHall,
  Hotel,
  Resort,
  SharedRoom,
  Tour,
  Transport,
  Visa,
} from "@/types/catalog";
import type { BookingVertical, Price } from "@/types/booking";
import { SeededRandom } from "@/lib/random";
import { slugify } from "@/lib/utils";

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

/** Every valid Unsplash ID used by the curated seeds — reused for variety. */
const IMAGE_IDS = [
  "photo-1566073771259-6a8506099945",
  "photo-1551882547-ff40c63fe5fa",
  "photo-1590490360182-c33d57733427",
  "photo-1502672260266-1c1ef2d93688",
  "photo-1522708323590-d24dbb6b0267",
  "photo-1560448204-e02f11c3d0e2",
  "photo-1571896349842-33c89424de2d",
  "photo-1520250497591-112f2f40a3f4",
  "photo-1602002418082-a4443e081dd1",
  "photo-1555854877-bab0e564b8d5",
  "photo-1595576508898-0ad5c879a061",
  "photo-1631049307264-da0ec9d70304",
  "photo-1519167758481-83f550bb49b3",
  "photo-1517457373958-b7bdd4587205",
  "photo-1464366400600-7168b8af9bc3",
  "photo-1549194388-f61be84a6e9e",
  "photo-1544620347-c4fd4a3d5957",
  "photo-1520255870062-bd79d3865de7",
  "photo-1543429776-2782fc8e1acd",
  "photo-1489493887464-892be6d1daae",
  "photo-1544551763-46a013bb70d5",
  "photo-1414235077428-338989a2e8c0",
  "photo-1507608616759-54f48f0af0ee",
  "photo-1488646953014-85cb44e25828",
  "photo-1485738422979-f5c462d49f74",
  "photo-1512453979798-5ea266f8880c",
];

/** Destination pool: [city, country, countryCode]. */
const DESTINATIONS: [string, string, string][] = [
  ["Paris", "France", "FR"],
  ["Nice", "France", "FR"],
  ["Barcelona", "Spain", "ES"],
  ["Madrid", "Spain", "ES"],
  ["Lisbon", "Portugal", "PT"],
  ["Rome", "Italy", "IT"],
  ["Florence", "Italy", "IT"],
  ["Venice", "Italy", "IT"],
  ["Santorini", "Greece", "GR"],
  ["Athens", "Greece", "GR"],
  ["London", "United Kingdom", "GB"],
  ["Amsterdam", "Netherlands", "NL"],
  ["Vienna", "Austria", "AT"],
  ["Zurich", "Switzerland", "CH"],
  ["Istanbul", "Türkiye", "TR"],
  ["Dubai", "United Arab Emirates", "AE"],
  ["Abu Dhabi", "United Arab Emirates", "AE"],
  ["Doha", "Qatar", "QA"],
  ["Cairo", "Egypt", "EG"],
  ["Marrakech", "Morocco", "MA"],
  ["Cape Town", "South Africa", "ZA"],
  ["Nairobi", "Kenya", "KE"],
  ["Dhaka", "Bangladesh", "BD"],
  ["Cox's Bazar", "Bangladesh", "BD"],
  ["New Delhi", "India", "IN"],
  ["Jaipur", "India", "IN"],
  ["Malé", "Maldives", "MV"],
  ["Colombo", "Sri Lanka", "LK"],
  ["Bangkok", "Thailand", "TH"],
  ["Phuket", "Thailand", "TH"],
  ["Bali", "Indonesia", "ID"],
  ["Ubud", "Indonesia", "ID"],
  ["Singapore", "Singapore", "SG"],
  ["Kuala Lumpur", "Malaysia", "MY"],
  ["Hanoi", "Vietnam", "VN"],
  ["Tokyo", "Japan", "JP"],
  ["Kyoto", "Japan", "JP"],
  ["Seoul", "South Korea", "KR"],
  ["Sydney", "Australia", "AU"],
  ["Auckland", "New Zealand", "NZ"],
  ["New York", "United States", "US"],
  ["San Francisco", "United States", "US"],
  ["Toronto", "Canada", "CA"],
  ["Rio de Janeiro", "Brazil", "BR"],
  ["Buenos Aires", "Argentina", "AR"],
];

const BADGES = [
  "Breakfast included",
  "Free cancellation",
  "Best seller",
  "Superhost",
  "Great value",
  "New",
  "Eco-certified",
  "Instant book",
];

/** Build the shared base fields (image, location, price, rating, badges…). */
function makeBase<V extends BookingVertical>(
  rng: SeededRandom,
  vertical: V,
  prefix: string,
  index: number,
  titleFn: (dest: [string, string, string]) => string,
  priceRange: [number, number],
  unit: string,
) {
  const dest = rng.pick(DESTINATIONS);
  const title = titleFn(dest);
  const amount = rng.int(priceRange[0], priceRange[1]);
  const hasDiscount = rng.bool(0.4);
  const price: Price = {
    amount,
    unit,
    ...(hasDiscount ? { original: Math.round(amount * rng.float(1.12, 1.4)) } : {}),
  };
  const badges = rng.bool(0.5) ? [rng.pick(BADGES)] : undefined;

  return {
    id: `${prefix}-g${index}`,
    slug: `${slugify(title)}-${prefix}${index}`,
    vertical,
    title,
    image: img(rng.pick(IMAGE_IDS)),
    location: {
      label: `${dest[0]}, ${dest[1]}`,
      city: dest[0],
      country: dest[1],
      countryCode: dest[2],
    },
    price,
    rating: rng.float(4, 5, 1),
    reviewCount: rng.int(24, 3200),
    ...(badges ? { badges } : {}),
    featured: false,
  };
}

const HOTEL_AMENITIES = [
  "Free WiFi",
  "Pool",
  "Spa",
  "Parking",
  "Gym",
  "Restaurant",
  "Bar",
  "Airport shuttle",
  "Breakfast",
  "Business center",
];
const HOTEL_NAMES = ["Grand", "Royal", "Azure", "Crown", "Park", "Harbour", "Emerald", "Skyline", "Palm", "Luna"];
const HOTEL_KINDS = ["Hotel", "Suites", "Inn", "Boutique Hotel", "Grand Hotel"];

export function generateHotels(count: number, seed = 101): Hotel[] {
  const rng = new SeededRandom(seed);
  return Array.from({ length: count }, (_, i) => ({
    ...makeBase(rng, "hotels", "htl", i + 100, (d) =>
      `${rng.pick(HOTEL_NAMES)} ${d[0]} ${rng.pick(HOTEL_KINDS)}`,
      [60, 420], "per night"),
    stars: rng.int(3, 5),
    amenities: rng.pickMany(HOTEL_AMENITIES, rng.int(3, 6)),
    roomType: rng.pick(["Standard rooms", "Deluxe rooms", "Executive suites", "Sea-view rooms"]),
  }));
}

export function generateApartments(count: number, seed = 202): Apartment[] {
  const rng = new SeededRandom(seed);
  const kinds = ["Loft", "Studio", "Apartment", "Penthouse", "Residence", "Flat"];
  return Array.from({ length: count }, (_, i) => {
    const bedrooms = rng.int(0, 4);
    return {
      ...makeBase(rng, "apartments", "apt", i + 100, (d) =>
        `${rng.pick(["Sunlit", "Riverside", "Central", "Cozy", "Modern", "Skyline"])} ${rng.pick(kinds)} in ${d[0]}`,
        [45, 260], "per night"),
      bedrooms: bedrooms === 0 ? 1 : bedrooms,
      bathrooms: rng.int(1, 3),
      guests: rng.int(2, 8),
      sizeSqm: rng.int(32, 160),
    };
  });
}

export function generateResorts(count: number, seed = 303): Resort[] {
  const rng = new SeededRandom(seed);
  return Array.from({ length: count }, (_, i) => ({
    ...makeBase(rng, "resorts", "rst", i + 100, (d) =>
      `${rng.pick(["Palm", "Coral", "Emerald", "Ocean", "Sunset", "Lagoon"])} ${d[0]} Resort`,
      [150, 600], "per night"),
    stars: rng.int(4, 5),
    amenities: rng.pickMany(["Private beach", "Spa", "Infinity pool", "Water sports", "Kids club", "5 restaurants", "Yoga", "Beachfront"], rng.int(3, 5)),
    boardType: rng.pick(["All inclusive", "Half board", "Breakfast", "Full board"]),
  }));
}

export function generateSharedRooms(count: number, seed = 404): SharedRoom[] {
  const rng = new SeededRandom(seed);
  return Array.from({ length: count }, (_, i) => ({
    ...makeBase(rng, "shared-rooms", "shr", i + 100, (d) =>
      `${rng.pick(["Backpackers", "Harbour", "Old Quarter", "Central", "Nomad", "Social"])} ${rng.pick(["Hostel", "Poshtel", "Hub", "Lodge"])} ${d[0]}`,
      [10, 45], "per bed / night"),
    bedsAvailable: rng.int(2, 10),
    roomType: rng.pick(["Mixed dorm", "Female dorm", "Male dorm", "Private pod"]),
    amenities: rng.pickMany(["Free WiFi", "Lockers", "Common kitchen", "Breakfast", "Bar", "Rooftop", "Tours desk"], rng.int(3, 5)),
  }));
}

export function generateConventionHalls(count: number, seed = 505): ConventionHall[] {
  const rng = new SeededRandom(seed);
  return Array.from({ length: count }, (_, i) => ({
    ...makeBase(rng, "convention-hall", "cvh", i + 100, (d) =>
      `${rng.pick(["Grand", "Metropolitan", "Riverside", "Horizon", "Imperial"])} ${d[0]} ${rng.pick(["Ballroom", "Conference Center", "Events Pavilion", "Convention Hall"])}`,
      [800, 4000], "per day"),
    capacity: rng.int(120, 1200),
    areaSqm: rng.int(400, 1600),
    layouts: rng.pickMany(["Theatre", "Banquet", "Classroom", "U-shape", "Reception", "Boardroom"], rng.int(2, 4)),
  }));
}

export function generateTransport(count: number, seed = 606): Transport[] {
  const rng = new SeededRandom(seed);
  const types = ["Private car", "Luxury coach", "Ferry", "Shared van", "Limousine", "Minibus"];
  return Array.from({ length: count }, (_, i) => {
    const dest = rng.pick(DESTINATIONS);
    const type = rng.pick(types);
    return {
      ...makeBase(rng, "transport", "trn", i + 100, () =>
        `${type} — ${dest[0]} Transfer`,
        [15, 120], "per trip"),
      transportType: type,
      seats: rng.pick([3, 4, 8, 16, 48, 120]),
      route: { from: `${dest[0]} Airport`, to: `${dest[0]} City center` },
      durationHours: rng.int(1, 5),
    };
  });
}

export function generateTours(count: number, seed = 707): Tour[] {
  const rng = new SeededRandom(seed);
  return Array.from({ length: count }, (_, i) => ({
    ...makeBase(rng, "tours", "tur", i + 100, (d) =>
      `${rng.pick(["Highlights of", "Discover", "Grand", "Essential", "Wonders of"])} ${d[1]} ${rng.pick(["Tour", "Expedition", "Getaway", "Journey"])}`,
      [200, 1800], "per person"),
    durationDays: rng.int(2, 14),
    groupSize: rng.int(6, 20),
    tourType: rng.pick(["Cultural", "Adventure", "Beach", "Wildlife", "Food & wine", "Historical"]),
  }));
}

export function generateActivities(count: number, seed = 808): Activity[] {
  const rng = new SeededRandom(seed);
  const cats = ["Water", "Adventure", "Food & drink", "Culture", "Nature", "Nightlife", "Wellness", "Sightseeing"];
  return Array.from({ length: count }, (_, i) => ({
    ...makeBase(rng, "activities", "act", i + 100, (d) =>
      `${rng.pick(["Sunset", "Guided", "Private", "Small-group", "Half-day", "Full-day"])} ${rng.pick(["Cruise", "Food Tour", "Balloon Ride", "City Walk", "Diving", "Cooking Class", "Safari"])} in ${d[0]}`,
      [20, 220], "per person"),
    durationHours: rng.int(2, 8),
    category: rng.pick(cats),
  }));
}

export function generateVisas(count: number, seed = 909): Visa[] {
  const rng = new SeededRandom(seed);
  return Array.from({ length: count }, (_, i) => {
    const dest = rng.pick(DESTINATIONS);
    return {
      ...makeBase(rng, "visa", "vsa", i + 100, () =>
        `${dest[1]} ${rng.pick(["Tourist Visa", "Visa Assistance", "e-Visa", "Business Visa"])}`,
        [40, 250], "per person"),
      location: { label: dest[1] },
      country: dest[1],
      processingTime: rng.pick(["2–4 business days", "5–7 business days", "10–15 business days", "3–5 weeks"]),
      validity: rng.pick(["30 days", "90 days", "180 days", "Up to 1 year", "Up to 10 years"]),
      entryType: rng.pick(["Single entry", "Multiple entry"]),
    };
  });
}
