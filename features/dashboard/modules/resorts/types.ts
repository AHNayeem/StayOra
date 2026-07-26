import type { StatusDef } from "../../lib/status";

export const RESORT_STATUS_VALUES = ["draft", "published", "archived"] as const;
export type ResortStatus = (typeof RESORT_STATUS_VALUES)[number];

export interface Resort {
  id: string;
  name: string;
  city: string;
  country: string;
  rooms: number;
  rating: number;
  pricePerNight: number;
  currency: string;
  status: ResortStatus;
  updatedAt: string;
}

export const RESORT_STATUSES: readonly StatusDef<ResortStatus>[] = [
  { value: "draft", label: "Draft", tone: "neutral" },
  { value: "published", label: "Published", tone: "success" },
  { value: "archived", label: "Archived", tone: "warning" },
];
