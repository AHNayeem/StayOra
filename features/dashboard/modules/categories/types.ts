import type { StatusDef } from "../../lib/status";

export const CATEGORY_STATUS_VALUES = ["active", "hidden"] as const;
export type CategoryStatus = (typeof CATEGORY_STATUS_VALUES)[number];

export const CATEGORY_GROUP_VALUES = [
  "Stays",
  "Experiences",
  "Transport",
  "Services",
] as const;
export type CategoryGroup = (typeof CATEGORY_GROUP_VALUES)[number];

export interface Category {
  id: string;
  name: string;
  slug: string;
  group: CategoryGroup;
  itemsCount: number;
  status: CategoryStatus;
  updatedAt: string;
}

export const CATEGORY_STATUSES: readonly StatusDef<CategoryStatus>[] = [
  { value: "active", label: "Active", tone: "success" },
  { value: "hidden", label: "Hidden", tone: "neutral" },
];
