import type { StatusDef } from "../../lib/status";

export const VISA_STATUS_VALUES = ["active", "inactive"] as const;
export type VisaStatus = (typeof VISA_STATUS_VALUES)[number];

export const VISA_TYPES = [
  "Tourist",
  "Business",
  "Transit",
  "Student",
  "Work",
] as const;
export type VisaType = (typeof VISA_TYPES)[number];

export interface Visa {
  id: string;
  country: string;
  type: VisaType;
  processingDays: number;
  fee: number;
  currency: string;
  status: VisaStatus;
  updatedAt: string;
}

export const VISA_STATUSES: readonly StatusDef<VisaStatus>[] = [
  { value: "active", label: "Active", tone: "success" },
  { value: "inactive", label: "Inactive", tone: "neutral" },
];
