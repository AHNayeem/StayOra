import type { StatusDef } from "../../lib/status";

export const ACTIVITY_STATUS_VALUES = ["draft", "published", "archived"] as const;
export type ActivityStatus = (typeof ACTIVITY_STATUS_VALUES)[number];

export const ACTIVITY_CATEGORIES = [
  "Tour",
  "Adventure",
  "Cultural",
  "Food & Drink",
  "Water Sports",
] as const;
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

export interface Activity {
  id: string;
  name: string;
  city: string;
  country: string;
  category: ActivityCategory;
  durationHours: number;
  price: number;
  currency: string;
  capacity: number;
  status: ActivityStatus;
  updatedAt: string;
}

export const ACTIVITY_STATUSES: readonly StatusDef<ActivityStatus>[] = [
  { value: "draft", label: "Draft", tone: "neutral" },
  { value: "published", label: "Published", tone: "success" },
  { value: "archived", label: "Archived", tone: "warning" },
];
