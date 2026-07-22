import type { Merchant, MerchantStatus } from "./types";

const NAMES = [
  "Azure Bay Hospitality", "Highline Group", "Marina Living", "Cedarwood Stays",
  "Sunset Collective", "Grand Atrium Events", "Palm Grove Resorts", "Metro Suites",
  "Northwind Lodges", "Coral Coast Rentals", "Alpine Retreats", "Harbor House",
  "Desert Rose Villas", "Emerald Isle Stays", "Riverside Apartments", "Skyline Hotels",
  "Old Town Guesthouses", "Lagoon Escapes",
];
const CATEGORIES = ["Hotels", "Apartments", "Resorts", "Transport", "Activities"];
const COUNTRIES = ["United States", "United Kingdom", "United Arab Emirates", "Germany", "Japan", "Brazil"];
const CURRENCIES = ["USD", "GBP", "AED", "EUR"];
const STATUSES: MerchantStatus[] = ["pending", "active", "suspended", "rejected"];

function isoDaysFromEpoch(dayOffset: number): string {
  const base = Date.UTC(2025, 0, 1);
  return new Date(base + dayOffset * 86_400_000).toISOString();
}

export const MERCHANTS_SEED: Merchant[] = NAMES.map((name, i) => ({
  id: `mch_${200 + i}`,
  name,
  email: `partners@${name.toLowerCase().replace(/[^a-z]+/g, "")}.com`,
  contactName: ["Ava", "Ben", "Chen", "Dana", "Eli", "Farah"][i % 6] + " " +
    ["Khan", "Silva", "Wong", "Meyer", "Adams", "Rao"][i % 6],
  category: CATEGORIES[i % CATEGORIES.length],
  country: COUNTRIES[i % COUNTRIES.length],
  properties: 2 + ((i * 3) % 40),
  commissionRate: 0.08 + (i % 6) * 0.015,
  revenue: 12_000 + i * 4_800,
  currency: CURRENCIES[i % CURRENCIES.length],
  status: STATUSES[i % STATUSES.length],
  joinedAt: isoDaysFromEpoch((i * 17) % 500),
}));
