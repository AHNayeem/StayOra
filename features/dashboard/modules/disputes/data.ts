import type { Dispute, DisputeReason, DisputeStatus } from "./types";

const MERCHANTS = [
  "Azure Bay Hospitality", "Highline Group", "Marina Living", "Cedarwood Stays",
  "Sunset Collective", "Palm Grove Resorts", "Metro Suites", "Northwind Lodges",
];
const CUSTOMERS = [
  "Amelia Clarke", "Noah Bennett", "Sofia Rossi", "Liam O'Connor",
  "Yuki Tanaka", "Omar Haddad", "Isabella Ferreira", "Ethan Wright",
];
const CURRENCIES = ["USD", "GBP", "AED", "EUR"];
const REASONS: DisputeReason[] = [
  "fraudulent", "product_not_received", "not_as_described", "duplicate",
  "subscription_canceled",
];
const STATUS_CYCLE: DisputeStatus[] = [
  "needs_response", "under_review", "won", "needs_response", "lost", "under_review",
];

function iso(dayOffset: number): string {
  return new Date(Date.UTC(2026, 6, 1) - dayOffset * 86_400_000).toISOString();
}

export const DISPUTES_SEED: Dispute[] = Array.from({ length: 20 }, (_, i) => {
  const openedDaysAgo = i * 2;
  return {
    id: `dsp_${600 + i}`,
    reference: `DSP-${7100 + i}`,
    bookingRef: `BK-${1042 + (i % 26)}`,
    merchant: MERCHANTS[i % MERCHANTS.length],
    customer: CUSTOMERS[i % CUSTOMERS.length],
    reason: REASONS[i % REASONS.length],
    amount: Math.round((180 + ((i * 143) % 1600)) * 100) / 100,
    currency: CURRENCIES[i % CURRENCIES.length],
    status: STATUS_CYCLE[i % STATUS_CYCLE.length],
    openedAt: iso(openedDaysAgo),
    // Response window is ~7 days from opening.
    dueAt: iso(openedDaysAgo - 7),
  };
});
