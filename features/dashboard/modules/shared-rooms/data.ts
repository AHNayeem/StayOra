import type { SharedRoom, SharedRoomStatus } from "./types";

const NAMES = [
  "Backpackers Central Hostel", "Nomad Dorm House", "The Wanderer Hostel", "City Bunk Lodge",
  "Sunrise Dormitory", "Traveller's Rest Hostel", "Urban Nest Bunks", "The Cozy Dorm",
  "Riverside Backpackers", "Old Town Bunkhouse", "Skyline Dorm Hostel", "Harbour Bunk Lodge",
  "Green Leaf Hostel", "Mountain View Dorms", "The Social Bunkhouse", "Lantern Hostel",
];
const CITIES: [string, string][] = [
  ["Bangkok", "Thailand"], ["Lisbon", "Portugal"], ["Prague", "Czech Republic"],
  ["Amsterdam", "Netherlands"], ["Barcelona", "Spain"], ["Hanoi", "Vietnam"],
];
const CURRENCIES = ["USD", "EUR", "GBP", "AED"];
const STATUSES: SharedRoomStatus[] = ["draft", "published", "archived"];

function iso(dayOffset: number): string {
  return new Date(Date.UTC(2026, 9, 1) + dayOffset * 86_400_000).toISOString();
}

export const SHARED_ROOMS_SEED: SharedRoom[] = NAMES.map((name, i) => {
  const [city, country] = CITIES[i % CITIES.length];
  return {
    id: `shr_${300 + i}`,
    name,
    city,
    country,
    beds: 4 + (i % 6) * 2,
    pricePerBed: 15 + (i % 10) * 6,
    currency: CURRENCIES[i % CURRENCIES.length],
    status: STATUSES[i % STATUSES.length],
    updatedAt: iso((i * 5) % 90),
  };
});
