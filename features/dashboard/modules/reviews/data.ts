import type { Review, ReviewStatus } from "./types";

const GUESTS = [
  "Liam Carter", "Noor Haddad", "Sofia Rossi", "Kenji Tanaka", "Amara Okafor",
  "Diego Morales", "Elena Petrova", "Yusuf Demir", "Mia Nguyen", "Omar Farouk",
];
const PROPERTIES = [
  "Azure Bay Resort", "The Highline Hotel", "Marina View Apartments",
  "Cedarwood Lodge", "Palm Grove Villas", "Metro Central Suites",
];
const TITLES = [
  "Wonderful stay", "Great location", "Could be better", "Exceeded expectations",
  "Not as described", "Lovely staff", "Clean and quiet", "Would return",
];
const COMMENTS = [
  "The room was spotless and the staff went above and beyond.",
  "Perfectly located near everything we wanted to see.",
  "Check-in was slow and the room felt smaller than the photos.",
  "Amazing views and a fantastic breakfast selection every morning.",
  "The amenities listed were not all available during our stay.",
];
const STATUSES: ReviewStatus[] = ["pending", "approved", "rejected", "reported"];

function iso(dayOffset: number): string {
  return new Date(Date.UTC(2026, 5, 10) + dayOffset * 86_400_000).toISOString();
}

export const REVIEWS_SEED: Review[] = Array.from({ length: 20 }, (_, i) => ({
  id: `rev_${700 + i}`,
  guest: GUESTS[i % GUESTS.length],
  property: PROPERTIES[i % PROPERTIES.length],
  rating: (i % 5) + 1,
  title: TITLES[i % TITLES.length],
  comment: COMMENTS[i % COMMENTS.length],
  status: STATUSES[i % STATUSES.length],
  createdAt: iso((i * 2) % 30),
}));
