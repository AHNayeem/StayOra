import type { StatusDef } from "../../lib/status";

export const REFUND_STATUS_VALUES = [
  "requested",
  "approved",
  "processing",
  "refunded",
  "rejected",
] as const;
export type RefundStatus = (typeof REFUND_STATUS_VALUES)[number];

export interface Refund {
  id: string;
  reference: string;
  bookingRef: string;
  customer: string;
  amount: number;
  currency: string;
  reason: string;
  status: RefundStatus;
  createdAt: string;
}

export const REFUND_STATUSES: readonly StatusDef<RefundStatus>[] = [
  { value: "requested", label: "Requested", tone: "warning" },
  { value: "approved", label: "Approved", tone: "info" },
  { value: "processing", label: "Processing", tone: "warning" },
  { value: "refunded", label: "Refunded", tone: "success" },
  { value: "rejected", label: "Rejected", tone: "danger" },
];
