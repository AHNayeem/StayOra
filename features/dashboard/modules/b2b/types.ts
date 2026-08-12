/**
 * B2B module types — agency/corporate accounts, their credit position and the
 * consolidated invoices raised against them.
 */

export type {
  B2BAccount,
  B2BAccountStatus,
  B2BAccountType,
  B2BInvoice,
  B2BInvoiceStatus,
  B2BSettlementTerm,
} from "../../domain/types";

export type { B2BPricing } from "../../domain/money";

import type { SelectOption } from "@/components/ui/select";
import type { StatusDef } from "../../lib/status";
import type {
  B2BAccountStatus,
  B2BAccountType,
  B2BInvoiceStatus,
  B2BSettlementTerm,
} from "../../domain/types";

export const B2B_ACCOUNT_STATUSES: readonly StatusDef<B2BAccountStatus>[] = [
  { value: "pending", label: "Pending approval", tone: "warning" },
  { value: "active", label: "Active", tone: "success" },
  { value: "suspended", label: "Suspended", tone: "danger" },
  { value: "closed", label: "Closed", tone: "neutral" },
];

export const B2B_INVOICE_STATUSES: readonly StatusDef<B2BInvoiceStatus>[] = [
  { value: "draft", label: "Draft", tone: "neutral" },
  { value: "issued", label: "Issued", tone: "info" },
  { value: "part_paid", label: "Part paid", tone: "warning" },
  { value: "paid", label: "Paid", tone: "success" },
  { value: "overdue", label: "Overdue", tone: "danger" },
  { value: "void", label: "Void", tone: "neutral" },
];

export const ACCOUNT_TYPE_LABELS: Record<B2BAccountType, string> = {
  travel_agency: "Travel agency",
  corporate: "Corporate client",
  tour_operator: "Tour operator",
};

export const ACCOUNT_TYPE_OPTIONS: SelectOption[] = Object.entries(
  ACCOUNT_TYPE_LABELS,
).map(([value, label]) => ({ value, label }));

export const SETTLEMENT_TERM_LABELS: Record<B2BSettlementTerm, string> = {
  prepaid: "Prepaid",
  net_7: "Net 7 days",
  net_15: "Net 15 days",
  net_30: "Net 30 days",
};

export const SETTLEMENT_TERM_OPTIONS: SelectOption[] = Object.entries(
  SETTLEMENT_TERM_LABELS,
).map(([value, label]) => ({ value, label }));
