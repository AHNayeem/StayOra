import type { Commission, CommissionStatus } from "./types";

const MERCHANTS = [
  "Azure Bay Hospitality", "Highline Group", "Marina Living", "Cedarwood Stays",
  "Sunset Collective", "Palm Grove Resorts", "Metro Suites", "Northwind Lodges",
];
const RATES = [8, 10, 12.5, 15, 18];
const CURRENCIES = ["USD", "GBP", "AED", "EUR"];
const STATUSES: CommissionStatus[] = ["pending", "settled", "reversed"];

function iso(dayOffset: number): string {
  return new Date(Date.UTC(2026, 0, 1) + dayOffset * 86_400_000).toISOString();
}

export const COMMISSIONS_SEED: Commission[] = Array.from({ length: 22 }, (_, i) => {
  const bookingAmount = 400 + (i % 12) * 180;
  const rate = RATES[i % RATES.length];
  return {
    id: `cmn_${500 + i}`,
    reference: `CMN-${9100 + i}`,
    merchant: MERCHANTS[i % MERCHANTS.length],
    bookingRef: `BK-${1042 + (i % 26)}`,
    bookingAmount,
    rate,
    commissionAmount: Math.round(bookingAmount * rate) / 100,
    currency: CURRENCIES[i % CURRENCIES.length],
    status: STATUSES[i % STATUSES.length],
    createdAt: iso((i * 2) % 40),
  };
});
