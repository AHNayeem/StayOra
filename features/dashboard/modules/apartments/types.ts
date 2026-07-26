import type { StatusDef } from "../../lib/status";

export const APARTMENT_STATUS_VALUES = ["draft", "published", "archived"] as const;
export type ApartmentStatus = (typeof APARTMENT_STATUS_VALUES)[number];

export interface Apartment {
  id: string;
  name: string;
  city: string;
  country: string;
  bedrooms: number;
  maxGuests: number;
  pricePerNight: number;
  currency: string;
  status: ApartmentStatus;
  updatedAt: string;
}

export const APARTMENT_STATUSES: readonly StatusDef<ApartmentStatus>[] = [
  { value: "draft", label: "Draft", tone: "neutral" },
  { value: "published", label: "Published", tone: "success" },
  { value: "archived", label: "Archived", tone: "warning" },
];
