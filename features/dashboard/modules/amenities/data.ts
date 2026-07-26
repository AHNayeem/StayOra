import type { Amenity, AmenityCategory, AmenityStatus } from "./types";

const AMENITIES: [string, AmenityCategory, string][] = [
  ["Free WiFi", "Connectivity", "wifi"],
  ["Air conditioning", "Room", "wind"],
  ["Swimming pool", "Wellness", "waves"],
  ["Fitness center", "Wellness", "dumbbell"],
  ["Restaurant", "Dining", "utensils"],
  ["Bar / lounge", "Dining", "wine"],
  ["Free parking", "Property", "car"],
  ["Airport shuttle", "Property", "bus"],
  ["Spa", "Wellness", "flower"],
  ["Room service", "Room", "concierge-bell"],
  ["Kids club", "Family", "baby"],
  ["Pet friendly", "Family", "paw-print"],
  ["Business center", "Property", "briefcase"],
  ["Breakfast included", "Dining", "coffee"],
  ["Smart TV", "Room", "tv"],
  ["EV charging", "Connectivity", "plug"],
];
const STATUSES: AmenityStatus[] = ["enabled", "disabled"];

function iso(dayOffset: number): string {
  return new Date(Date.UTC(2026, 5, 1) + dayOffset * 86_400_000).toISOString();
}

export const AMENITIES_SEED: Amenity[] = AMENITIES.map(
  ([name, category, icon], i) => ({
    id: `amn_${500 + i}`,
    name,
    category,
    icon,
    status: STATUSES[i % STATUSES.length],
    updatedAt: iso((i * 5) % 90),
  }),
);
