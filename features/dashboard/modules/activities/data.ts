import type { Activity, ActivityCategory, ActivityStatus } from "./types";

const NAMES = [
  "Old Town Walking Tour", "Sunrise Summit Hike", "Museum & Galleries Pass",
  "Street Food Crawl", "Coastal Kayak Adventure", "Vineyard Tasting Trail",
  "Desert Dune Safari", "Historic Castle Visit", "Reef Snorkeling Trip",
  "Night Market Experience", "River Rafting Expedition", "Cooking Class & Feast",
  "Cathedral & Cloisters Tour", "Zipline Canopy Ride", "Harbor Sailing Cruise",
  "Artisan Quarter Walk",
];
const CITIES: [string, string][] = [
  ["Barcelona", "Spain"], ["Queenstown", "New Zealand"], ["Kyoto", "Japan"],
  ["Marrakech", "Morocco"], ["Cape Town", "South Africa"], ["Lisbon", "Portugal"],
];
const CATEGORIES: ActivityCategory[] = [
  "Tour", "Adventure", "Cultural", "Food & Drink", "Water Sports",
];
const CURRENCIES = ["EUR", "USD", "JPY", "MAD"];
const STATUSES: ActivityStatus[] = ["draft", "published", "archived"];

function iso(dayOffset: number): string {
  return new Date(Date.UTC(2026, 4, 1) + dayOffset * 86_400_000).toISOString();
}

export const ACTIVITIES_SEED: Activity[] = NAMES.map((name, i) => {
  const [city, country] = CITIES[i % CITIES.length];
  return {
    id: `act_${400 + i}`,
    name,
    city,
    country,
    category: CATEGORIES[i % CATEGORIES.length],
    durationHours: 1.5 + (i % 6) * 0.75,
    price: 25 + (i % 9) * 18,
    currency: CURRENCIES[i % CURRENCIES.length],
    capacity: 8 + (i % 7) * 6,
    status: STATUSES[i % STATUSES.length],
    updatedAt: iso((i * 5) % 90),
  };
});
