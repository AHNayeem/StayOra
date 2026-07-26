import type { Payout, PayoutStatus } from "./types";

const MERCHANTS = [
  "Azure Bay Hospitality", "Highline Group", "Marina Living", "Cedarwood Stays",
  "Sunset Collective", "Palm Grove Resorts", "Metro Suites", "Northwind Lodges",
];
const METHODS = ["Bank transfer", "Wallet", "PayPal"];
const CURRENCIES = ["USD", "GBP", "AED", "EUR"];
const STATUSES: PayoutStatus[] = ["scheduled", "processing", "paid", "failed"];

function iso(dayOffset: number): string {
  return new Date(Date.UTC(2026, 2, 1) + dayOffset * 86_400_000).toISOString();
}

export const PAYOUTS_SEED: Payout[] = Array.from({ length: 22 }, (_, i) => ({
  id: `pyt_${500 + i}`,
  reference: `PO-${7200 + i}`,
  merchant: MERCHANTS[i % MERCHANTS.length],
  method: METHODS[i % METHODS.length],
  amount: 500 + (i % 12) * 250,
  currency: CURRENCIES[i % CURRENCIES.length],
  status: STATUSES[i % STATUSES.length],
  createdAt: iso((i * 2) % 40),
}));
