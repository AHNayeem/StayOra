import type { Refund, RefundStatus } from "./types";

const CUSTOMERS = [
  "Amelia Turner", "Rajiv Menon", "Sofia Larsen", "Daniel Okafor",
  "Priya Nair", "Marcus Bloom", "Hana Suzuki", "Elena Rossi",
];
const REASONS = [
  "Cancelled by guest", "Property unavailable", "Duplicate booking",
  "Overcharged", "Host cancellation", "Service not as described",
];
const CURRENCIES = ["USD", "GBP", "AED", "EUR"];
const STATUSES: RefundStatus[] = [
  "requested", "approved", "processing", "refunded", "rejected",
];

function iso(dayOffset: number): string {
  return new Date(Date.UTC(2026, 3, 1) + dayOffset * 86_400_000).toISOString();
}

export const REFUNDS_SEED: Refund[] = Array.from({ length: 22 }, (_, i) => ({
  id: `rfd_${500 + i}`,
  reference: `RFD-${3300 + i}`,
  bookingRef: `BK-${1042 + (i % 26)}`,
  customer: CUSTOMERS[i % CUSTOMERS.length],
  amount: 90 + (i % 12) * 110,
  currency: CURRENCIES[i % CURRENCIES.length],
  reason: REASONS[i % REASONS.length],
  status: STATUSES[i % STATUSES.length],
  createdAt: iso((i * 2) % 40),
}));
