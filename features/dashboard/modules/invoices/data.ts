import type { Invoice, InvoiceStatus } from "./types";

const MERCHANTS = [
  "Azure Bay Hospitality", "Highline Group", "Marina Living", "Cedarwood Stays",
  "Sunset Collective", "Palm Grove Resorts", "Metro Suites", "Northwind Lodges",
];
const CURRENCIES = ["USD", "GBP", "AED", "EUR"];
const STATUSES: InvoiceStatus[] = ["paid", "pending", "overdue", "void"];

function iso(dayOffset: number): string {
  return new Date(Date.UTC(2026, 1, 1) + dayOffset * 86_400_000).toISOString();
}

export const INVOICES_SEED: Invoice[] = Array.from({ length: 22 }, (_, i) => ({
  id: `inv_${500 + i}`,
  number: `INV-${4400 + i}`,
  merchant: MERCHANTS[i % MERCHANTS.length],
  amount: 320 + (i % 12) * 210,
  currency: CURRENCIES[i % CURRENCIES.length],
  issuedAt: iso((i * 2) % 40),
  dueAt: iso(((i * 2) % 40) + 30),
  status: STATUSES[i % STATUSES.length],
}));
