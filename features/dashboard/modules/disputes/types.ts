import type { StatusDef } from "../../lib/status";

export const DISPUTE_STATUS_VALUES = [
  "needs_response",
  "under_review",
  "won",
  "lost",
] as const;
export type DisputeStatus = (typeof DISPUTE_STATUS_VALUES)[number];

export const DISPUTE_REASON_VALUES = [
  "fraudulent",
  "product_not_received",
  "not_as_described",
  "duplicate",
  "subscription_canceled",
] as const;
export type DisputeReason = (typeof DISPUTE_REASON_VALUES)[number];

export interface Dispute {
  id: string;
  reference: string;
  bookingRef: string;
  merchant: string;
  customer: string;
  reason: DisputeReason;
  amount: number;
  currency: string;
  status: DisputeStatus;
  openedAt: string;
  /** Evidence submission deadline. */
  dueAt: string;
}

export interface DisputeSummary {
  open: number;
  underReview: number;
  atRisk: number;
  wonRate: number;
  currency: string;
}

export const DISPUTE_STATUSES: readonly StatusDef<DisputeStatus>[] = [
  { value: "needs_response", label: "Needs response", tone: "danger" },
  { value: "under_review", label: "Under review", tone: "warning" },
  { value: "won", label: "Won", tone: "success" },
  { value: "lost", label: "Lost", tone: "neutral" },
];

export const DISPUTE_REASONS: readonly StatusDef<DisputeReason>[] = [
  { value: "fraudulent", label: "Fraudulent", tone: "danger" },
  { value: "product_not_received", label: "Not received", tone: "warning" },
  { value: "not_as_described", label: "Not as described", tone: "warning" },
  { value: "duplicate", label: "Duplicate", tone: "info" },
  { value: "subscription_canceled", label: "Canceled", tone: "neutral" },
];
