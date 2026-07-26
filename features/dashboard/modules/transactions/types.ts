import type { StatusDef } from "../../lib/status";

export const TRANSACTION_TYPE_VALUES = [
  "capture",
  "payout",
  "refund",
  "commission",
  "adjustment",
  "topup",
] as const;
export type TransactionType = (typeof TRANSACTION_TYPE_VALUES)[number];

export const TRANSACTION_STATUS_VALUES = [
  "completed",
  "pending",
  "failed",
] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUS_VALUES)[number];

/** Credit adds to the platform/merchant balance; debit removes from it. */
export type TransactionDirection = "credit" | "debit";

export interface Transaction {
  id: string;
  reference: string;
  type: TransactionType;
  direction: TransactionDirection;
  merchant: string;
  description: string;
  amount: number;
  currency: string;
  balanceAfter: number;
  status: TransactionStatus;
  createdAt: string;
}

export interface TransactionSummary {
  inflow: number;
  outflow: number;
  net: number;
  count: number;
  currency: string;
}

export const TRANSACTION_TYPES: readonly StatusDef<TransactionType>[] = [
  { value: "capture", label: "Capture", tone: "success" },
  { value: "payout", label: "Payout", tone: "info" },
  { value: "refund", label: "Refund", tone: "warning" },
  { value: "commission", label: "Commission", tone: "info" },
  { value: "adjustment", label: "Adjustment", tone: "neutral" },
  { value: "topup", label: "Top-up", tone: "success" },
];

export const TRANSACTION_STATUSES: readonly StatusDef<TransactionStatus>[] = [
  { value: "completed", label: "Completed", tone: "success" },
  { value: "pending", label: "Pending", tone: "warning" },
  { value: "failed", label: "Failed", tone: "danger" },
];
