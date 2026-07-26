import type { StatusDef } from "../../lib/status";

export const INVOICE_STATUS_VALUES = [
  "paid",
  "pending",
  "overdue",
  "void",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUS_VALUES)[number];

export interface Invoice {
  id: string;
  number: string;
  merchant: string;
  amount: number;
  currency: string;
  issuedAt: string;
  dueAt: string;
  status: InvoiceStatus;
}

export const INVOICE_STATUSES: readonly StatusDef<InvoiceStatus>[] = [
  { value: "paid", label: "Paid", tone: "success" },
  { value: "pending", label: "Pending", tone: "warning" },
  { value: "overdue", label: "Overdue", tone: "danger" },
  { value: "void", label: "Void", tone: "neutral" },
];
