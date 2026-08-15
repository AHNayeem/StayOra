/**
 * Payouts — the disbursement view of a settlement.
 *
 * A payout was previously a separate stub with its own merchant names, amounts
 * and lifecycle, sitting next to Settlements in the finance menu and quietly
 * disagreeing with it. There is only ever one fact here: a settlement is what
 * the merchant is owed, and a payout is that settlement leaving the platform.
 * So a payout is **derived** from a settlement plus the merchant's payout
 * instructions, and moving a payout moves the settlement.
 */

import {
  PAYOUT_METHOD_LABELS,
  PAYOUT_SCHEDULE_LABELS,
  type Merchant,
  type PayoutSchedule,
} from "./merchants";
import type { Settlement, SettlementStatus } from "./types";

export type PayoutStatus = SettlementStatus;

export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  pending: "Pending approval",
  scheduled: "Scheduled",
  processing: "Processing",
  paid: "Paid",
  on_hold: "On hold",
  failed: "Failed",
};

export const PAYOUT_STATUS_TONES: Record<
  PayoutStatus,
  "neutral" | "info" | "success" | "warning" | "danger"
> = {
  pending: "warning",
  scheduled: "info",
  processing: "warning",
  paid: "success",
  on_hold: "warning",
  failed: "danger",
};

/**
 * A settlement seen as money leaving the platform.
 *
 * Every figure comes from the settlement; only the *instructions* (method,
 * schedule, destination account) come from the merchant record.
 */
export interface Payout {
  id: string;
  reference: string;
  settlementId: string;
  merchantId: string;
  merchantName: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  /** Human description of how the money moves. */
  method: string;
  /** How often this merchant is paid. */
  schedule: PayoutSchedule;
  scheduleLabel: string;
  /** Masked destination account, or a note when none is on file. */
  destination: string;
  /** Days after period close before release, from the merchant's contract. */
  termDays: number;
  periodStart: string;
  periodEnd: string;
  scheduledFor: string;
  paidAt?: string;
  bookingCount: number;
  /** True when the merchant has no verified account to be paid into. */
  blocked: boolean;
  blockedReason?: string;
}

/** Project a settlement into a payout using the merchant's instructions. */
export function toPayout(settlement: Settlement, merchant: Merchant | undefined): Payout {
  const bank = merchant?.bank;
  const verified = bank?.status === "verified";

  return {
    id: `pyt_${settlement.id}`,
    reference: settlement.reference.replace(/^STL/, "PO"),
    settlementId: settlement.id,
    merchantId: settlement.merchantId,
    merchantName: settlement.merchantName,
    amount: settlement.netPayable,
    currency: settlement.currency,
    status: settlement.status,
    method: bank ? PAYOUT_METHOD_LABELS[bank.method] : settlement.method,
    schedule: bank?.schedule ?? "monthly",
    scheduleLabel: PAYOUT_SCHEDULE_LABELS[bank?.schedule ?? "monthly"],
    destination: verified
      ? `${bank.bankName} ${bank.accountNumberMasked}`
      : bank
        ? `${bank.bankName} ${bank.accountNumberMasked} (unverified)`
        : "No payout account on file",
    termDays: merchant?.contract.payoutTermDays ?? 30,
    periodStart: settlement.periodStart,
    periodEnd: settlement.periodEnd,
    scheduledFor: settlement.scheduledFor,
    paidAt: settlement.paidAt,
    bookingCount: settlement.bookingCount,
    // A payout with nowhere to go is the one thing finance must see before
    // approving a run, so it is on the record rather than discovered later.
    blocked: !verified,
    blockedReason: !bank
      ? "The merchant has not submitted payout details."
      : !verified
        ? "The merchant's payout account is not verified."
        : undefined,
  };
}

export interface PayoutSummary {
  currency: string;
  /** Awaiting finance approval. */
  pending: number;
  pendingAmount: number;
  scheduled: number;
  scheduledAmount: number;
  paidAmount: number;
  onHoldAmount: number;
  /** Payouts that cannot be released because the account isn't verified. */
  blocked: number;
  blockedAmount: number;
}

export function summarizePayouts(payouts: Payout[], currency = "USD"): PayoutSummary {
  const sum = (rows: Payout[]) =>
    Math.round(rows.reduce((n, p) => n + p.amount, 0) * 100) / 100;

  const pending = payouts.filter((p) => p.status === "pending");
  const scheduled = payouts.filter((p) => p.status === "scheduled");
  const blocked = payouts.filter((p) => p.blocked && p.status !== "paid");

  return {
    currency,
    pending: pending.length,
    pendingAmount: sum(pending),
    scheduled: scheduled.length,
    scheduledAmount: sum(scheduled),
    paidAmount: sum(payouts.filter((p) => p.status === "paid")),
    onHoldAmount: sum(payouts.filter((p) => p.status === "on_hold")),
    blocked: blocked.length,
    blockedAmount: sum(blocked),
  };
}

/** Next payout date for a merchant, from their schedule. Presentation only. */
export function nextPayoutDate(schedule: PayoutSchedule, from: Date): Date {
  const next = new Date(from);
  const days = schedule === "weekly" ? 7 : schedule === "biweekly" ? 14 : 30;
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}
