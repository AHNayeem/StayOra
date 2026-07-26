import type { StatusDef } from "../../lib/status";

export const COMMISSION_STATUS_VALUES = [
  "pending",
  "settled",
  "reversed",
] as const;
export type CommissionStatus = (typeof COMMISSION_STATUS_VALUES)[number];

export interface Commission {
  id: string;
  reference: string;
  merchant: string;
  bookingRef: string;
  bookingAmount: number;
  rate: number;
  commissionAmount: number;
  currency: string;
  status: CommissionStatus;
  createdAt: string;
}

export const COMMISSION_STATUSES: readonly StatusDef<CommissionStatus>[] = [
  { value: "pending", label: "Pending", tone: "warning" },
  { value: "settled", label: "Settled", tone: "success" },
  { value: "reversed", label: "Reversed", tone: "info" },
];
