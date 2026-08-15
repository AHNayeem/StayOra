/**
 * Chargebacks and disputes.
 *
 * Previously a stand-alone stub whose `merchant` was a bare name string, so a
 * merchant could not see — let alone answer — a dispute raised against their own
 * booking. Disputes are now domain records keyed to a real booking and a real
 * merchant, with the merchant's response and evidence on the case, and the
 * platform holding the final decision.
 */

import type { BookingSegment } from "./types";

export const DISPUTE_STATUS_VALUES = [
  "needs_response",
  "merchant_responded",
  "under_review",
  "won",
  "lost",
  "accepted",
] as const;

export type DisputeStatus = (typeof DISPUTE_STATUS_VALUES)[number];

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  needs_response: "Needs response",
  merchant_responded: "Merchant responded",
  under_review: "Under review",
  won: "Won",
  lost: "Lost",
  accepted: "Liability accepted",
};

export const DISPUTE_STATUS_TONES: Record<
  DisputeStatus,
  "neutral" | "info" | "success" | "warning" | "danger"
> = {
  needs_response: "danger",
  merchant_responded: "info",
  under_review: "warning",
  won: "success",
  lost: "neutral",
  accepted: "neutral",
};

export const DISPUTE_REASON_VALUES = [
  "fraudulent",
  "product_not_received",
  "not_as_described",
  "duplicate",
  "subscription_canceled",
] as const;

export type DisputeReason = (typeof DISPUTE_REASON_VALUES)[number];

export const DISPUTE_REASON_LABELS: Record<DisputeReason, string> = {
  fraudulent: "Fraudulent",
  product_not_received: "Service not received",
  not_as_described: "Not as described",
  duplicate: "Duplicate charge",
  subscription_canceled: "Cancelled but charged",
};

/**
 * Who may move a dispute where.
 *
 * A merchant can respond or concede; only the platform can decide the outcome.
 * That asymmetry is the whole point of a dispute, so it lives in the transition
 * table rather than in a button's `disabled` prop.
 */
export const DISPUTE_TRANSITIONS: Record<
  DisputeStatus,
  { merchant: readonly DisputeStatus[]; platform: readonly DisputeStatus[] }
> = {
  needs_response: {
    merchant: ["merchant_responded", "accepted"],
    platform: ["under_review", "lost", "won"],
  },
  merchant_responded: { merchant: [], platform: ["under_review", "won", "lost"] },
  under_review: { merchant: [], platform: ["won", "lost"] },
  won: { merchant: [], platform: [] },
  lost: { merchant: [], platform: [] },
  accepted: { merchant: [], platform: ["lost"] },
};

export function canTransitionDispute(
  from: DisputeStatus,
  to: DisputeStatus,
  actor: "merchant" | "platform",
): boolean {
  return DISPUTE_TRANSITIONS[from][actor].includes(to);
}

/** Statuses where the money is still at risk. */
export const AT_RISK_STATUSES: readonly DisputeStatus[] = [
  "needs_response",
  "merchant_responded",
  "under_review",
];

/** A piece of evidence attached by the merchant. Metadata only — no file. */
export interface DisputeEvidence {
  id: string;
  label: string;
  fileName: string;
  addedAt: string;
  addedBy: string;
}

export interface DisputeEvent {
  id: string;
  at: string;
  status: DisputeStatus;
  label: string;
  actor: string;
  note?: string;
}

export interface Dispute {
  id: string;
  reference: string;
  bookingId: string;
  bookingRef: string;
  merchantId: string;
  merchantName: string;
  customerName: string;
  customerEmail: string;
  segment: BookingSegment;
  reason: DisputeReason;
  /** What the cardholder said. */
  claim: string;
  amount: number;
  currency: string;
  status: DisputeStatus;
  openedAt: string;
  /** Evidence deadline. Past it, the case is decided without a response. */
  dueAt: string;
  /** The merchant's written answer. */
  merchantResponse?: string;
  respondedAt?: string;
  evidence: DisputeEvidence[];
  decidedAt?: string;
  decidedBy?: string;
  decisionNote?: string;
  timeline: DisputeEvent[];
}

export interface DisputeSummary {
  open: number;
  needsResponse: number;
  underReview: number;
  /** Value still at risk. */
  atRisk: number;
  /** Won ÷ decided, 0–1. */
  wonRate: number;
  currency: string;
}

export function summarizeDisputes(disputes: Dispute[]): DisputeSummary {
  const needsResponse = disputes.filter((d) => d.status === "needs_response");
  const underReview = disputes.filter(
    (d) => d.status === "under_review" || d.status === "merchant_responded",
  );
  const atRisk = disputes
    .filter((d) => AT_RISK_STATUSES.includes(d.status))
    .reduce((n, d) => n + d.amount, 0);
  const decided = disputes.filter(
    (d) => d.status === "won" || d.status === "lost" || d.status === "accepted",
  );
  const won = decided.filter((d) => d.status === "won").length;

  return {
    open: needsResponse.length + underReview.length,
    needsResponse: needsResponse.length,
    underReview: underReview.length,
    atRisk: Math.round(atRisk * 100) / 100,
    wonRate: decided.length === 0 ? 0 : won / decided.length,
    currency: "USD",
  };
}

/** Days left to respond. Negative once the window has closed. */
export function daysToRespond(dispute: Dispute, nowMs = Date.now()): number {
  return Math.ceil((new Date(dispute.dueAt).getTime() - nowMs) / 86_400_000);
}
