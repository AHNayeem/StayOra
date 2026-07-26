import type { Visa, VisaStatus, VisaType } from "./types";

const COUNTRIES = [
  "United States", "United Kingdom", "Schengen Area", "Japan", "Australia",
  "Canada", "United Arab Emirates", "Singapore", "India", "Brazil",
  "South Africa", "Thailand", "Turkey", "New Zealand", "China", "Egypt",
];
const TYPES: VisaType[] = ["Tourist", "Business", "Transit", "Student", "Work"];
const CURRENCIES = ["USD", "GBP", "EUR", "AED"];
const STATUSES: VisaStatus[] = ["active", "inactive"];

function iso(dayOffset: number): string {
  return new Date(Date.UTC(2026, 7, 1) + dayOffset * 86_400_000).toISOString();
}

export const VISAS_SEED: Visa[] = COUNTRIES.map((country, i) => {
  return {
    id: `vsa_${700 + i}`,
    country,
    type: TYPES[i % TYPES.length],
    processingDays: 3 + (i % 8) * 4,
    fee: 40 + (i % 10) * 30,
    currency: CURRENCIES[i % CURRENCIES.length],
    status: STATUSES[i % STATUSES.length],
    updatedAt: iso((i * 5) % 90),
  };
});
