import type { StatusDef } from "../../lib/status";

export const CONVENTION_HALL_STATUS_VALUES = ["draft", "published", "archived"] as const;
export type ConventionHallStatus = (typeof CONVENTION_HALL_STATUS_VALUES)[number];

export interface ConventionHall {
  id: string;
  name: string;
  city: string;
  country: string;
  capacity: number;
  halls: number;
  pricePerDay: number;
  currency: string;
  status: ConventionHallStatus;
  updatedAt: string;
}

export const CONVENTION_HALL_STATUSES: readonly StatusDef<ConventionHallStatus>[] = [
  { value: "draft", label: "Draft", tone: "neutral" },
  { value: "published", label: "Published", tone: "success" },
  { value: "archived", label: "Archived", tone: "warning" },
];
