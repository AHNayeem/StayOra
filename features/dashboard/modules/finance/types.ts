import type { StatusDef } from "../../lib/status";

export const PAYMENT_STATUS_VALUES = [
  "captured",
  "pending",
  "failed",
  "refunded",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUS_VALUES)[number];

export interface Payment {
  id: string;
  reference: string;
  merchant: string;
  bookingRef: string;
  method: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
}

export const PAYMENT_STATUSES: readonly StatusDef<PaymentStatus>[] = [
  { value: "captured", label: "Captured", tone: "success" },
  { value: "pending", label: "Pending", tone: "warning" },
  { value: "failed", label: "Failed", tone: "danger" },
  { value: "refunded", label: "Refunded", tone: "info" },
];
