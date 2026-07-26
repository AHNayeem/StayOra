import type { TaxRule, TaxCategory, TaxType, TaxStatus } from "./types";

interface Seed {
  name: string;
  region: string;
  category: TaxCategory;
  rate: number;
  type: TaxType;
  status: TaxStatus;
}

const SEEDS: Seed[] = [
  { name: "UK VAT", region: "United Kingdom", category: "All bookings", rate: 20, type: "inclusive", status: "active" },
  { name: "EU VAT (standard)", region: "European Union", category: "Accommodation", rate: 21, type: "inclusive", status: "active" },
  { name: "UAE VAT", region: "United Arab Emirates", category: "All bookings", rate: 5, type: "exclusive", status: "active" },
  { name: "US Sales Tax (avg)", region: "United States", category: "Service fee", rate: 8.5, type: "exclusive", status: "active" },
  { name: "City tourism levy", region: "France", category: "Accommodation", rate: 3.5, type: "exclusive", status: "active" },
  { name: "GST", region: "Singapore", category: "All bookings", rate: 9, type: "inclusive", status: "active" },
  { name: "Transport service tax", region: "United Kingdom", category: "Transport", rate: 12, type: "exclusive", status: "inactive" },
  { name: "Activities levy", region: "Spain", category: "Tours & Activities", rate: 10, type: "exclusive", status: "active" },
  { name: "Platform service tax", region: "Global", category: "Service fee", rate: 2, type: "exclusive", status: "inactive" },
];

function iso(dayOffset: number): string {
  return new Date(Date.UTC(2026, 6, 1) - dayOffset * 86_400_000).toISOString();
}

export const TAXES_SEED: TaxRule[] = SEEDS.map((s, i) => ({
  id: `tax_${200 + i}`,
  ...s,
  updatedAt: iso(i * 5),
}));
