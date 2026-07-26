import type { StatusDef } from "../../lib/status";

export const TRANSPORT_STATUS_VALUES = ["active", "inactive"] as const;
export type TransportStatus = (typeof TRANSPORT_STATUS_VALUES)[number];

export const TRANSPORT_TYPES = [
  "Car",
  "Van",
  "Bus",
  "Ferry",
  "Shuttle",
  "Train",
] as const;
export type TransportType = (typeof TRANSPORT_TYPES)[number];

export interface Transport {
  id: string;
  name: string;
  type: TransportType;
  route: string;
  seats: number;
  pricePerTrip: number;
  currency: string;
  status: TransportStatus;
  updatedAt: string;
}

export const TRANSPORT_STATUSES: readonly StatusDef<TransportStatus>[] = [
  { value: "active", label: "Active", tone: "success" },
  { value: "inactive", label: "Inactive", tone: "neutral" },
];
