import type { Transport, TransportStatus, TransportType } from "./types";

const NAMES = [
  "Airport Express Sedan", "City Hopper Van", "Coastal Line Coach",
  "Island Ferry Service", "Downtown Shuttle", "Regional Rail Link",
  "Executive Car Transfer", "Group Tour Van", "Metro Night Bus",
  "Harbor Crossing Ferry", "Hotel Shuttle Loop", "Intercity Rail Pass",
  "Private Chauffeur Car", "Family Minivan Transfer", "Beach Line Bus",
  "Airport Ferry Link",
];
const TYPES: TransportType[] = ["Car", "Van", "Bus", "Ferry", "Shuttle", "Train"];
const ROUTES = [
  "Airport → City Center", "Downtown → Suburbs", "Old Town → Coast",
  "Harbor → Island", "Hotel Zone → Airport", "Central → North Terminal",
];
const CURRENCIES = ["USD", "EUR", "GBP", "AED"];
const STATUSES: TransportStatus[] = ["active", "inactive"];

function iso(dayOffset: number): string {
  return new Date(Date.UTC(2026, 5, 1) + dayOffset * 86_400_000).toISOString();
}

export const TRANSPORT_SEED: Transport[] = NAMES.map((name, i) => {
  return {
    id: `trn_${500 + i}`,
    name,
    type: TYPES[i % TYPES.length],
    route: ROUTES[i % ROUTES.length],
    seats: 3 + (i % 8) * 6,
    pricePerTrip: 15 + (i % 10) * 22,
    currency: CURRENCIES[i % CURRENCIES.length],
    status: STATUSES[i % STATUSES.length],
    updatedAt: iso((i * 5) % 90),
  };
});
