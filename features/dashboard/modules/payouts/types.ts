import type { StatusDef } from "../../lib/status";

/**
 * Payout lifecycle. `pending_approval` and `on_hold` exist because a payout is
 * an operational decision, not just a bank instruction: finance approves it,
 * can park it while a dispute or refund settles, and can reject it outright.
 */
export const PAYOUT_STATUS_VALUES = [
  "pending_approval",
  "scheduled",
  "on_hold",
  "processing",
  "paid",
  "failed",
  "rejected",
] as const;
export type PayoutStatus = (typeof PAYOUT_STATUS_VALUES)[number];

/** One step in a payout's history. */
export interface PayoutEvent {
  at: string;
  label: string;
  actor: string;
  note?: string;
}

export interface Payout {
  id: string;
  reference: string;
  merchant: string;
  method: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  createdAt: string;
  /** Set while the payout is parked. */
  holdReason?: string;
  timeline: PayoutEvent[];
}

export const PAYOUT_STATUSES: readonly StatusDef<PayoutStatus>[] = [
  { value: "pending_approval", label: "Pending approval", tone: "warning" },
  { value: "scheduled", label: "Scheduled", tone: "info" },
  { value: "on_hold", label: "On hold", tone: "warning" },
  { value: "processing", label: "Processing", tone: "warning" },
  { value: "paid", label: "Paid", tone: "success" },
  { value: "failed", label: "Failed", tone: "danger" },
  { value: "rejected", label: "Rejected", tone: "danger" },
];

/**
 * Which moves are legal from each state. Mirrors the domain's settlement
 * machine: a paid payout is terminal, a rejected one can only be reopened by
 * raising a new payout.
 */
export const PAYOUT_TRANSITIONS: Record<PayoutStatus, readonly PayoutStatus[]> = {
  pending_approval: ["scheduled", "on_hold", "rejected"],
  scheduled: ["processing", "on_hold"],
  on_hold: ["scheduled", "rejected"],
  processing: ["paid", "failed"],
  paid: [],
  failed: ["processing", "on_hold"],
  rejected: [],
};
