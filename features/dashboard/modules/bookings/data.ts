import type { Booking, BookingStatus } from "./types";

/**
 * Seed dataset for the no-backend stub service. Generated deterministically so
 * pagination, sorting and filtering have enough rows to exercise, without
 * committing a giant fixture. Replaced by a real endpoint later.
 */
const PROPERTIES: [string, string][] = [
  ["Azure Bay Resort", "Resort"],
  ["The Highline Hotel", "Hotel"],
  ["Marina View Apartments", "Apartment"],
  ["Cedarwood Lodge", "Hotel"],
  ["Sunset Shared Loft", "Shared Room"],
  ["Grand Atrium Hall", "Convention Hall"],
  ["Palm Grove Villas", "Resort"],
  ["Metro Central Suites", "Apartment"],
];

const GUESTS = [
  "Liam Carter", "Noor Haddad", "Sofia Rossi", "Kenji Tanaka", "Amara Okafor",
  "Diego Morales", "Elena Petrova", "Yusuf Demir", "Mia Nguyen", "Omar Farouk",
  "Hana Kim", "Lucas Silva", "Fatima Zahra", "Arjun Mehta",
];

const CHANNELS = ["Web", "iOS", "Android", "Partner"];
const CURRENCIES = ["USD", "EUR", "GBP", "AED"];
const STATUSES: BookingStatus[] = [
  "pending", "confirmed", "checked_in", "completed", "cancelled", "refunded",
];

function isoDaysFromEpoch(dayOffset: number): string {
  // Deterministic dates around mid-2026 (no Date.now to keep SSR stable).
  const base = Date.UTC(2026, 5, 1); // 2026-06-01
  return new Date(base + dayOffset * 86_400_000).toISOString();
}

export const BOOKINGS_SEED: Booking[] = Array.from({ length: 26 }, (_, i) => {
  const [property, propertyType] = PROPERTIES[i % PROPERTIES.length];
  const nights = (i % 6) + 1;
  const checkInOffset = (i * 3) % 60;
  const amountPerNight = 120 + (i % 8) * 45;
  const guest = GUESTS[i % GUESTS.length];
  return {
    id: `bkg_${1000 + i}`,
    reference: `BK-${1042 + i}`,
    guestName: guest,
    guestEmail: `${guest.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`,
    property,
    propertyType,
    checkIn: isoDaysFromEpoch(checkInOffset),
    checkOut: isoDaysFromEpoch(checkInOffset + nights),
    nights,
    guests: (i % 4) + 1,
    amount: amountPerNight * nights,
    currency: CURRENCIES[i % CURRENCIES.length],
    status: STATUSES[i % STATUSES.length],
    channel: CHANNELS[i % CHANNELS.length],
    createdAt: isoDaysFromEpoch(checkInOffset - 7),
  };
});
