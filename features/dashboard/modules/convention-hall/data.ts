import type { ConventionHall, ConventionHallStatus } from "./types";

const NAMES = [
  "Grand Meridian Center", "Riverside Convention Hall", "Skyline Expo Pavilion",
  "Metropolitan Congress Hall", "Harbor Point Conference Center", "Summit Events Complex",
  "Crystal Palace Halls", "Union Square Auditorium", "Lakeside Convention Center",
  "Imperial Ballroom Hall", "Central Exhibition Hall", "Northgate Congress Center",
  "Panorama Event Pavilion", "Heritage Convention Hall", "Aurora Expo Center",
  "Gateway Conference Complex",
];
const CITIES: [string, string][] = [
  ["Singapore", "Singapore"], ["Frankfurt", "Germany"], ["Dubai", "United Arab Emirates"],
  ["Chicago", "United States"], ["Sydney", "Australia"], ["Toronto", "Canada"],
];
const CURRENCIES = ["SGD", "EUR", "AED", "USD"];
const STATUSES: ConventionHallStatus[] = ["draft", "published", "archived"];

function iso(dayOffset: number): string {
  return new Date(Date.UTC(2026, 6, 1) + dayOffset * 86_400_000).toISOString();
}

export const CONVENTION_HALLS_SEED: ConventionHall[] = NAMES.map((name, i) => {
  const [city, country] = CITIES[i % CITIES.length];
  return {
    id: `cvh_${600 + i}`,
    name,
    city,
    country,
    capacity: 200 + (i % 10) * 350,
    halls: 1 + (i % 6),
    pricePerDay: 800 + (i % 9) * 450,
    currency: CURRENCIES[i % CURRENCIES.length],
    status: STATUSES[i % STATUSES.length],
    updatedAt: iso((i * 5) % 90),
  };
});
