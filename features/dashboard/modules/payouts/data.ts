import type { Payout, PayoutStatus } from "./types";

const MERCHANTS = [
  "Azure Bay Hospitality", "Highline Group", "Marina Living", "Cedarwood Stays",
  "Sunset Collective", "Palm Grove Resorts", "Metro Suites", "Northwind Lodges",
];
const METHODS = ["Bank transfer", "Wallet", "PayPal"];
const CURRENCIES = ["USD", "GBP", "AED", "EUR"];
const STATUSES: PayoutStatus[] = [
  "pending_approval",
  "scheduled",
  "processing",
  "paid",
  "on_hold",
  "failed",
];

function iso(dayOffset: number): string {
  return new Date(Date.UTC(2026, 2, 1) + dayOffset * 86_400_000).toISOString();
}

export const PAYOUTS_SEED: Payout[] = Array.from({ length: 22 }, (_, i) => {
  const status = STATUSES[i % STATUSES.length];
  const createdAt = iso((i * 2) % 40);
  return {
    id: `pyt_${500 + i}`,
    reference: `PO-${7200 + i}`,
    merchant: MERCHANTS[i % MERCHANTS.length],
    method: METHODS[i % METHODS.length],
    amount: 500 + (i % 12) * 250,
    currency: CURRENCIES[i % CURRENCIES.length],
    status,
    createdAt,
    holdReason: status === "on_hold" ? "Refund pending on a booking in this batch" : undefined,
    timeline: [
      { at: createdAt, label: "Payout raised", actor: "system", note: "Settlement batch closed." },
      ...(status === "pending_approval"
        ? []
        : [{ at: iso(((i * 2) % 40) + 1), label: "Approved by finance", actor: "Sana Rahman" }]),
      ...(status === "paid"
        ? [{ at: iso(((i * 2) % 40) + 2), label: "Paid to merchant", actor: "system" }]
        : []),
      ...(status === "on_hold"
        ? [
            {
              at: iso(((i * 2) % 40) + 1),
              label: "Placed on hold",
              actor: "Sana Rahman",
              note: "Refund pending on a booking in this batch",
            },
          ]
        : []),
      ...(status === "failed"
        ? [
            {
              at: iso(((i * 2) % 40) + 2),
              label: "Bank rejected the transfer",
              actor: "system",
              note: "Beneficiary account details need re-verifying.",
            },
          ]
        : []),
    ],
  } satisfies Payout;
});
