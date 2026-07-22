import type { Payment, PaymentStatus } from "./types";

const MERCHANTS = [
  "Azure Bay Hospitality", "Highline Group", "Marina Living", "Cedarwood Stays",
  "Sunset Collective", "Palm Grove Resorts", "Metro Suites", "Northwind Lodges",
];
const METHODS = ["Card", "Wallet", "Bank transfer", "Apple Pay"];
const CURRENCIES = ["USD", "GBP", "AED", "EUR"];
const STATUSES: PaymentStatus[] = ["captured", "pending", "failed", "refunded"];

function iso(dayOffset: number): string {
  return new Date(Date.UTC(2026, 5, 1) + dayOffset * 86_400_000).toISOString();
}

export const PAYMENTS_SEED: Payment[] = Array.from({ length: 22 }, (_, i) => ({
  id: `pay_${500 + i}`,
  reference: `PMT-${9100 + i}`,
  merchant: MERCHANTS[i % MERCHANTS.length],
  bookingRef: `BK-${1042 + (i % 26)}`,
  method: METHODS[i % METHODS.length],
  amount: 150 + (i % 12) * 120,
  currency: CURRENCIES[i % CURRENCIES.length],
  status: STATUSES[i % STATUSES.length],
  createdAt: iso((i * 2) % 40),
}));
