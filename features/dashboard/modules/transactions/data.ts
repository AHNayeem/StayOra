import type {
  Transaction,
  TransactionDirection,
  TransactionStatus,
  TransactionType,
} from "./types";

const MERCHANTS = [
  "Azure Bay Hospitality", "Highline Group", "Marina Living", "Cedarwood Stays",
  "Sunset Collective", "Palm Grove Resorts", "Metro Suites", "Northwind Lodges",
];
const CURRENCIES = ["USD", "GBP", "AED", "EUR"];

interface TypeSpec {
  type: TransactionType;
  direction: TransactionDirection;
  describe: (merchant: string, ref: string) => string;
}

const TYPE_SPECS: TypeSpec[] = [
  { type: "capture", direction: "credit", describe: (_m, r) => `Payment captured · ${r}` },
  { type: "commission", direction: "credit", describe: (m) => `Platform commission · ${m}` },
  { type: "payout", direction: "debit", describe: (m) => `Payout to ${m}` },
  { type: "refund", direction: "debit", describe: (_m, r) => `Refund issued · ${r}` },
  { type: "topup", direction: "credit", describe: (m) => `Wallet top-up · ${m}` },
  { type: "adjustment", direction: "debit", describe: (m) => `Manual adjustment · ${m}` },
];

const STATUS_CYCLE: TransactionStatus[] = [
  "completed", "completed", "completed", "pending", "completed", "failed",
];

function iso(dayOffset: number): string {
  return new Date(Date.UTC(2026, 6, 1) - dayOffset * 86_400_000).toISOString();
}

/** Running platform balance walked forward deterministically across the ledger. */
export const TRANSACTIONS_SEED: Transaction[] = (() => {
  let balance = 184_500;
  return Array.from({ length: 34 }, (_, i) => {
    const spec = TYPE_SPECS[i % TYPE_SPECS.length];
    const merchant = MERCHANTS[i % MERCHANTS.length];
    const bookingRef = `BK-${1042 + (i % 26)}`;
    const currency = CURRENCIES[i % CURRENCIES.length];
    const amount = Math.round((220 + ((i * 137) % 1900)) * 100) / 100;
    const status = STATUS_CYCLE[i % STATUS_CYCLE.length];
    if (status === "completed") {
      balance += spec.direction === "credit" ? amount : -amount;
    }
    return {
      id: `txn_${700 + i}`,
      reference: `TXN-${58_200 + i}`,
      type: spec.type,
      direction: spec.direction,
      merchant,
      description: spec.describe(merchant, bookingRef),
      amount,
      currency,
      balanceAfter: Math.round(balance * 100) / 100,
      status,
      createdAt: iso(i),
    };
  });
})();
