import type { StatusDef } from "../../lib/status";

export const SHARED_ROOM_STATUS_VALUES = ["draft", "published", "archived"] as const;
export type SharedRoomStatus = (typeof SHARED_ROOM_STATUS_VALUES)[number];

export interface SharedRoom {
  id: string;
  name: string;
  city: string;
  country: string;
  beds: number;
  pricePerBed: number;
  currency: string;
  status: SharedRoomStatus;
  updatedAt: string;
}

export const SHARED_ROOM_STATUSES: readonly StatusDef<SharedRoomStatus>[] = [
  { value: "draft", label: "Draft", tone: "neutral" },
  { value: "published", label: "Published", tone: "success" },
  { value: "archived", label: "Archived", tone: "warning" },
];
