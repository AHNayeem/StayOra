import type { StatusDef } from "../../lib/status";

export const AMENITY_STATUS_VALUES = ["enabled", "disabled"] as const;
export type AmenityStatus = (typeof AMENITY_STATUS_VALUES)[number];

export const AMENITY_CATEGORY_VALUES = [
  "Room",
  "Property",
  "Wellness",
  "Dining",
  "Connectivity",
  "Family",
] as const;
export type AmenityCategory = (typeof AMENITY_CATEGORY_VALUES)[number];

export interface Amenity {
  id: string;
  name: string;
  category: AmenityCategory;
  icon: string;
  status: AmenityStatus;
  updatedAt: string;
}

export const AMENITY_STATUSES: readonly StatusDef<AmenityStatus>[] = [
  { value: "enabled", label: "Enabled", tone: "success" },
  { value: "disabled", label: "Disabled", tone: "neutral" },
];
