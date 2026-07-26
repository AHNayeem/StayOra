import type { ReconciliationBatch, ReconciliationStatus } from "./types";

const GATEWAYS = ["Stripe", "PayPal", "Adyen", "Checkout.com"];
const CURRENCIES = ["USD", "GBP", "AED", "EUR"];
const PERIODS = [
  "01–07 Jun 2026", "08–14 Jun 2026", "15–21 Jun 2026", "22–28 Jun 2026",
  "25 May–31 May", "18–24 May 2026", "11–17 May 2026", "04–10 May 2026",
];
const STATUS_CYCLE: ReconciliationStatus[] = [
  "balanced", "balanced", "variance", "balanced", "pending", "balanced",
];

function iso(dayOffset: number): string {
  return new Date(Date.UTC(2026, 6, 1) - dayOffset * 86_400_000).toISOString();
}

export const RECONCILIATIONS_SEED: ReconciliationBatch[] = Array.from(
  { length: 18 },
  (_, i) => {
    const status = STATUS_CYCLE[i % STATUS_CYCLE.length];
    const expected = 24_000 + ((i * 4_300) % 96_000);
    const variance =
      status === "variance"
        ? Math.round(((i % 2 === 0 ? -1 : 1) * (140 + (i * 37) % 900)) * 100) / 100
        : 0;
    const settled = status === "pending" ? 0 : expected + variance;
    const matched = 120 + ((i * 17) % 340);
    const unmatched = status === "balanced" ? 0 : status === "pending" ? matched : 1 + (i % 4);
    return {
      id: `rec_${400 + i}`,
      reference: `REC-${3200 + i}`,
      gateway: GATEWAYS[i % GATEWAYS.length],
      period: PERIODS[i % PERIODS.length],
      expected,
      settled,
      variance,
      matched,
      unmatched,
      currency: CURRENCIES[i % CURRENCIES.length],
      status,
      runAt: iso(i * 3),
    };
  },
);
