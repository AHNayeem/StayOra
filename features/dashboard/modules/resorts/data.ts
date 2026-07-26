import type { Resort, ResortStatus } from "./types";

const NAMES = [
  "Azure Bay Resort", "Coral Sands Resort", "Palm Lagoon Resort", "Sunset Cove Resort",
  "Emerald Reef Resort", "Golden Dunes Resort", "Blue Horizon Resort", "Tropicana Shores",
  "Seabreeze Grand Resort", "Paradise Point Resort", "Ocean Pearl Resort", "Lagoon Palms Resort",
  "Crystal Waters Resort", "Bamboo Beach Resort", "Serene Isle Resort", "Marina Del Sol Resort",
];
const CITIES: [string, string][] = [
  ["Cancún", "Mexico"], ["Bali", "Indonesia"], ["Phuket", "Thailand"],
  ["Maldives", "Maldives"], ["Dubai", "United Arab Emirates"], ["Santorini", "Greece"],
];
const CURRENCIES = ["USD", "EUR", "GBP", "AED"];
const STATUSES: ResortStatus[] = ["draft", "published", "archived"];

function iso(dayOffset: number): string {
  return new Date(Date.UTC(2026, 5, 1) + dayOffset * 86_400_000).toISOString();
}

export const RESORTS_SEED: Resort[] = NAMES.map((name, i) => {
  const [city, country] = CITIES[i % CITIES.length];
  return {
    id: `rst_${300 + i}`,
    name,
    city,
    country,
    rooms: 40 + (i % 8) * 22,
    rating: 3.6 + (i % 4) * 0.35,
    pricePerNight: 140 + (i % 10) * 45,
    currency: CURRENCIES[i % CURRENCIES.length],
    status: STATUSES[i % STATUSES.length],
    updatedAt: iso((i * 5) % 90),
  };
});
