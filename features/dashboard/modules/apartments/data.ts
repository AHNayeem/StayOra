import type { Apartment, ApartmentStatus } from "./types";

const NAMES = [
  "Riverside Loft Suites", "Central Park Residences", "Harbour View Apartments", "The Maple Lofts",
  "Skyline Serviced Suites", "Old Town Residences", "Garden Court Apartments", "Marina Bay Flats",
  "Uptown Studio Suites", "Willow Lane Residences", "Bridgeport Lofts", "Cityscape Apartments",
  "Meadowbrook Suites", "Lakeshore Residences", "Kingsway Serviced Flats", "Camden Loft Suites",
];
const CITIES: [string, string][] = [
  ["New York", "United States"], ["London", "United Kingdom"], ["Dubai", "United Arab Emirates"],
  ["Berlin", "Germany"], ["Tokyo", "Japan"], ["Rio de Janeiro", "Brazil"],
];
const CURRENCIES = ["USD", "EUR", "GBP", "AED"];
const STATUSES: ApartmentStatus[] = ["draft", "published", "archived"];

function iso(dayOffset: number): string {
  return new Date(Date.UTC(2026, 7, 1) + dayOffset * 86_400_000).toISOString();
}

export const APARTMENTS_SEED: Apartment[] = NAMES.map((name, i) => {
  const [city, country] = CITIES[i % CITIES.length];
  return {
    id: `apt_${300 + i}`,
    name,
    city,
    country,
    bedrooms: 1 + (i % 4),
    maxGuests: 2 + (i % 4) * 2,
    pricePerNight: 80 + (i % 10) * 30,
    currency: CURRENCIES[i % CURRENCIES.length],
    status: STATUSES[i % STATUSES.length],
    updatedAt: iso((i * 5) % 90),
  };
});
