import type { StatusDef } from "../../lib/status";

export const TAX_STATUS_VALUES = ["active", "inactive"] as const;
export type TaxStatus = (typeof TAX_STATUS_VALUES)[number];

export const TAX_TYPE_VALUES = ["exclusive", "inclusive"] as const;
export type TaxType = (typeof TAX_TYPE_VALUES)[number];

export const TAX_CATEGORY_VALUES = [
  "Accommodation",
  "Transport",
  "Tours & Activities",
  "Service fee",
  "All bookings",
] as const;
export type TaxCategory = (typeof TAX_CATEGORY_VALUES)[number];

export interface TaxRule {
  id: string;
  name: string;
  /** Jurisdiction the rule applies to, e.g. "United Kingdom" or "EU". */
  region: string;
  category: TaxCategory;
  /** Percentage rate, 0–100. */
  rate: number;
  type: TaxType;
  status: TaxStatus;
  updatedAt: string;
}

export const TAX_STATUSES: readonly StatusDef<TaxStatus>[] = [
  { value: "active", label: "Active", tone: "success" },
  { value: "inactive", label: "Inactive", tone: "neutral" },
];

export const TAX_TYPES: readonly StatusDef<TaxType>[] = [
  { value: "exclusive", label: "Added on top", tone: "info" },
  { value: "inclusive", label: "Included in price", tone: "neutral" },
];
