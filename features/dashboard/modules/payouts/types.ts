import type { StatusDef } from "../../lib/status";

export const PAYOUT_STATUS_VALUES = [
  "scheduled",
  "processing",
  "paid",
  "failed",
] as const;
export type PayoutStatus = (typeof PAYOUT_STATUS_VALUES)[number];

export interface Payout {
  id: string;
  reference: string;
  merchant: string;
  method: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  createdAt: string;
}

export const PAYOUT_STATUSES: readonly StatusDef<PayoutStatus>[] = [
  { value: "scheduled", label: "Scheduled", tone: "info" },
  { value: "processing", label: "Processing", tone: "warning" },
  { value: "paid", label: "Paid", tone: "success" },
  { value: "failed", label: "Failed", tone: "danger" },
];
