import type { Hotel, HotelStatus } from "./types";

const NAMES = [
  "Azure Bay Resort", "The Highline Hotel", "Cedarwood Lodge", "Palm Grove Villas",
  "Metro Central Suites", "Northwind Lodge", "Coral Coast Inn", "Alpine Retreat",
  "Harbor House Hotel", "Desert Rose Resort", "Emerald Isle Hotel", "Skyline Grand",
  "Old Town Guesthouse", "Lagoon Escape", "Riverside Boutique", "Summit View Hotel",
];
const CITIES: [string, string][] = [
  ["New York", "United States"], ["London", "United Kingdom"], ["Dubai", "United Arab Emirates"],
  ["Berlin", "Germany"], ["Tokyo", "Japan"], ["Rio de Janeiro", "Brazil"],
];
const CURRENCIES = ["USD", "GBP", "AED", "EUR"];
const STATUSES: HotelStatus[] = ["draft", "published", "archived"];

function iso(dayOffset: number): string {
  return new Date(Date.UTC(2026, 3, 1) + dayOffset * 86_400_000).toISOString();
}

export const HOTELS_SEED: Hotel[] = NAMES.map((name, i) => {
  const [city, country] = CITIES[i % CITIES.length];
  return {
    id: `htl_${300 + i}`,
    name,
    city,
    country,
    rooms: 24 + (i % 8) * 18,
    rating: 3.5 + (i % 4) * 0.4,
    pricePerNight: 90 + (i % 10) * 35,
    currency: CURRENCIES[i % CURRENCIES.length],
    status: STATUSES[i % STATUSES.length],
    updatedAt: iso((i * 5) % 90),
  };
});
