import type { StatusDef } from "../../lib/status";

export const HOTEL_STATUS_VALUES = ["draft", "published", "archived"] as const;
export type HotelStatus = (typeof HOTEL_STATUS_VALUES)[number];

export interface Hotel {
  id: string;
  name: string;
  city: string;
  country: string;
  rooms: number;
  rating: number;
  pricePerNight: number;
  currency: string;
  status: HotelStatus;
  updatedAt: string;
}

export const HOTEL_STATUSES: readonly StatusDef<HotelStatus>[] = [
  { value: "draft", label: "Draft", tone: "neutral" },
  { value: "published", label: "Published", tone: "success" },
  { value: "archived", label: "Archived", tone: "warning" },
];
