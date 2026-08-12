/**
 * Booking, payment, refund and settlement state machines.
 *
 * This is the *only* place a status transition is declared legal. Services call
 * {@link assertTransition} before mutating, and UIs call
 * {@link availableBookingActions} to decide which buttons to render — so the
 * dashboard can never offer an action the domain would reject, and no component
 * invents a status of its own.
 */

import type { StatusDef } from "../lib/status";
import type {
  BookingFailureReason,
  BookingStatus,
  CancellationPolicy,
  CancellationPolicyId,
  PaymentStatus,
  ProductKind,
  RefundStatus,
  SettlementStatus,
} from "./types";

// ---------------------------------------------------------------------------
// Status registries (labels + tones live as data, never in JSX)
// ---------------------------------------------------------------------------

export const BOOKING_STATUSES: readonly StatusDef<BookingStatus>[] = [
  { value: "initiated", label: "Initiated", tone: "neutral" },
  { value: "payment_pending", label: "Payment pending", tone: "warning" },
  { value: "payment_processing", label: "Payment processing", tone: "warning" },
  { value: "confirmed", label: "Confirmed", tone: "success" },
  { value: "failed", label: "Booking failed", tone: "danger" },
  { value: "checked_in", label: "Checked in", tone: "info" },
  { value: "completed", label: "Completed", tone: "success" },
  { value: "cancellation_requested", label: "Cancellation requested", tone: "warning" },
  { value: "cancelled", label: "Cancelled", tone: "neutral" },
  { value: "refund_pending", label: "Refund pending", tone: "warning" },
  { value: "refund_processing", label: "Refund processing", tone: "info" },
  { value: "refunded", label: "Refunded", tone: "success" },
  { value: "refund_failed", label: "Refund failed", tone: "danger" },
];

export const PAYMENT_STATUSES: readonly StatusDef<PaymentStatus>[] = [
  { value: "pending", label: "Pending", tone: "warning" },
  { value: "processing", label: "Processing", tone: "warning" },
  { value: "authorized", label: "Authorized", tone: "info" },
  { value: "captured", label: "Captured", tone: "success" },
  { value: "failed", label: "Payment failed", tone: "danger" },
  { value: "refund_pending", label: "Refund pending", tone: "warning" },
  { value: "partially_refunded", label: "Partially refunded", tone: "info" },
  { value: "refunded", label: "Refunded", tone: "neutral" },
  { value: "voided", label: "Voided", tone: "neutral" },
];

export const REFUND_STATUSES: readonly StatusDef<RefundStatus>[] = [
  { value: "requested", label: "Requested", tone: "warning" },
  { value: "under_review", label: "Under review", tone: "info" },
  { value: "approved", label: "Approved", tone: "info" },
  { value: "rejected", label: "Rejected", tone: "danger" },
  { value: "processing", label: "Processing", tone: "warning" },
  { value: "completed", label: "Refunded", tone: "success" },
  { value: "failed", label: "Refund failed", tone: "danger" },
];

export const SETTLEMENT_STATUSES: readonly StatusDef<SettlementStatus>[] = [
  { value: "pending", label: "Pending", tone: "neutral" },
  { value: "scheduled", label: "Scheduled", tone: "info" },
  { value: "processing", label: "Processing", tone: "warning" },
  { value: "paid", label: "Paid", tone: "success" },
  { value: "on_hold", label: "On hold", tone: "warning" },
  { value: "failed", label: "Failed", tone: "danger" },
];

export const FAILURE_REASON_LABELS: Record<BookingFailureReason, string> = {
  payment_failed: "Payment failed",
  payment_declined: "Card declined by issuer",
  inventory_unavailable: "Inventory no longer available",
  seat_unavailable: "Seat no longer available",
  room_unavailable: "Room no longer available",
  provider_rejected: "Provider rejected the booking",
  timeout: "Provider timed out",
  technical_error: "Technical error",
  fraud_check: "Blocked by fraud review",
};

/** What the customer should do next, per failure reason. */
export const FAILURE_NEXT_ACTIONS: Record<BookingFailureReason, string> = {
  payment_failed: "Retry payment with the same or another method.",
  payment_declined: "Use a different card or contact your bank, then retry.",
  inventory_unavailable: "Choose another date or a similar property.",
  seat_unavailable: "Select a different seat or fare.",
  room_unavailable: "Pick another room type or nearby stay.",
  provider_rejected: "Contact support — we'll rebook with another provider.",
  timeout: "Retry the booking; nothing was reserved.",
  technical_error: "Retry shortly, or contact support if it persists.",
  fraud_check: "Contact support to verify the booking.",
};

// ---------------------------------------------------------------------------
// Transition tables
// ---------------------------------------------------------------------------

/**
 * Legal booking transitions.
 *
 *   initiated → payment_pending → payment_processing → confirmed | failed
 *   confirmed → checked_in → completed
 *   confirmed → cancellation_requested → cancelled
 *   cancelled | failed → refund_pending → refund_processing → refunded | refund_failed
 */
export const BOOKING_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  initiated: ["payment_pending", "failed"],
  payment_pending: ["payment_processing", "failed"],
  payment_processing: ["confirmed", "failed"],
  // A confirmed booking whose provider later rejects it still *fails* — it was
  // never delivered — which is why `failed` stays reachable from here.
  confirmed: ["checked_in", "completed", "cancellation_requested", "cancelled", "failed"],
  failed: ["refund_pending", "payment_pending"],
  checked_in: ["completed", "cancelled"],
  completed: ["cancellation_requested"],
  cancellation_requested: ["cancelled", "confirmed"],
  cancelled: ["refund_pending"],
  refund_pending: ["refund_processing", "cancelled"],
  refund_processing: ["refunded", "refund_failed"],
  refunded: [],
  refund_failed: ["refund_processing"],
};

export const REFUND_TRANSITIONS: Record<RefundStatus, readonly RefundStatus[]> = {
  requested: ["under_review", "approved", "rejected"],
  under_review: ["approved", "rejected"],
  approved: ["processing"],
  rejected: [],
  processing: ["completed", "failed"],
  completed: [],
  failed: ["processing", "rejected"],
};

export const SETTLEMENT_TRANSITIONS: Record<
  SettlementStatus,
  readonly SettlementStatus[]
> = {
  pending: ["scheduled", "on_hold"],
  scheduled: ["processing", "on_hold"],
  processing: ["paid", "failed"],
  paid: [],
  on_hold: ["scheduled", "pending"],
  failed: ["processing", "on_hold"],
};

/** Statuses that mean "money has left the customer and stayed with us". */
export const REVENUE_BEARING_STATUSES: readonly BookingStatus[] = [
  "confirmed",
  "checked_in",
  "completed",
];

/** Statuses that end the booking without delivery. */
export const TERMINAL_FAILURE_STATUSES: readonly BookingStatus[] = [
  "failed",
  "cancelled",
  "refund_pending",
  "refund_processing",
  "refunded",
  "refund_failed",
];

/** Products that have a check-in step; others go straight to completed. */
const CHECK_IN_KINDS: readonly ProductKind[] = [
  "hotels",
  "apartments",
  "resorts",
  "shared-rooms",
  "convention-hall",
];

/** Does this product kind use the `checked_in` extension state? */
export function hasCheckIn(kind: ProductKind): boolean {
  return CHECK_IN_KINDS.includes(kind);
}

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return BOOKING_TRANSITIONS[from]?.includes(to) ?? false;
}

export function nextBookingStatuses(from: BookingStatus): readonly BookingStatus[] {
  return BOOKING_TRANSITIONS[from] ?? [];
}

export function canTransitionRefund(from: RefundStatus, to: RefundStatus): boolean {
  return REFUND_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canTransitionSettlement(
  from: SettlementStatus,
  to: SettlementStatus,
): boolean {
  return SETTLEMENT_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Thrown when a caller attempts an illegal transition. */
export class TransitionError extends Error {
  constructor(entity: string, from: string, to: string) {
    super(`Illegal ${entity} transition: ${from} → ${to}`);
    this.name = "TransitionError";
  }
}

export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (!canTransition(from, to)) throw new TransitionError("booking", from, to);
}

export function assertRefundTransition(from: RefundStatus, to: RefundStatus): void {
  if (!canTransitionRefund(from, to)) throw new TransitionError("refund", from, to);
}

export function assertSettlementTransition(
  from: SettlementStatus,
  to: SettlementStatus,
): void {
  if (!canTransitionSettlement(from, to)) {
    throw new TransitionError("settlement", from, to);
  }
}

// ---------------------------------------------------------------------------
// Booking actions — the bridge between the state machine and the UI
// ---------------------------------------------------------------------------

export type BookingActionId =
  | "capture_payment"
  | "confirm"
  | "retry_payment"
  | "mark_failed"
  | "check_in"
  | "complete"
  | "request_cancellation"
  | "cancel"
  | "initiate_refund"
  | "process_refund"
  | "complete_refund";

export interface BookingActionDef {
  id: BookingActionId;
  label: string;
  /** Status the booking moves into. */
  to: BookingStatus;
  /** Statuses the action is offered from. */
  from: readonly BookingStatus[];
  /** Permission required to perform it. */
  permission: string;
  tone: "primary" | "outline" | "danger";
  /** Ask for confirmation before running. */
  confirm?: boolean;
  description: string;
}

/**
 * Every booking action the dashboard can perform, as data. `from` is checked
 * against the transition table at call time, so this list can never drift from
 * {@link BOOKING_TRANSITIONS}.
 */
export const BOOKING_ACTIONS: readonly BookingActionDef[] = [
  {
    id: "capture_payment",
    label: "Take payment",
    to: "payment_processing",
    from: ["payment_pending"],
    permission: "bookings:update",
    tone: "primary",
    description: "Send the charge to the gateway and hold the inventory.",
  },
  {
    id: "confirm",
    label: "Confirm booking",
    to: "confirmed",
    from: ["payment_processing", "cancellation_requested"],
    permission: "bookings:update",
    tone: "primary",
    description: "Provider accepted — issue the confirmation.",
  },
  {
    id: "retry_payment",
    label: "Retry payment",
    to: "payment_pending",
    from: ["failed"],
    permission: "bookings:update",
    tone: "primary",
    description: "Re-attempt the charge and rebook the same option.",
  },
  {
    id: "mark_failed",
    label: "Mark as failed",
    to: "failed",
    from: ["initiated", "payment_pending", "payment_processing", "confirmed"],
    permission: "bookings:update",
    tone: "danger",
    confirm: true,
    description: "Provider or payment failed — the booking was never delivered.",
  },
  {
    id: "check_in",
    label: "Check in",
    to: "checked_in",
    from: ["confirmed"],
    permission: "bookings:update",
    tone: "outline",
    description: "Guest has arrived.",
  },
  {
    id: "complete",
    label: "Mark completed",
    to: "completed",
    from: ["confirmed", "checked_in"],
    permission: "bookings:update",
    tone: "outline",
    description: "Trip delivered — releases the earning for settlement.",
  },
  {
    id: "request_cancellation",
    label: "Request cancellation",
    to: "cancellation_requested",
    from: ["confirmed", "checked_in", "completed"],
    permission: "bookings:update",
    tone: "outline",
    confirm: true,
    description: "Raise a cancellation for review against the policy.",
  },
  {
    id: "cancel",
    label: "Cancel booking",
    to: "cancelled",
    from: ["confirmed", "checked_in", "cancellation_requested"],
    permission: "bookings:update",
    tone: "danger",
    confirm: true,
    description: "Cancel and apply the cancellation policy.",
  },
  {
    id: "initiate_refund",
    label: "Initiate refund",
    to: "refund_pending",
    from: ["cancelled", "failed"],
    permission: "finance:update",
    tone: "primary",
    description: "Raise a refund for the eligible amount.",
  },
  {
    id: "process_refund",
    label: "Process refund",
    to: "refund_processing",
    from: ["refund_pending", "refund_failed"],
    permission: "finance:update",
    tone: "primary",
    description: "Send the refund to the payment provider.",
  },
  {
    id: "complete_refund",
    label: "Mark refunded",
    to: "refunded",
    from: ["refund_processing"],
    permission: "finance:update",
    tone: "primary",
    description: "Provider confirmed the money is back with the customer.",
  },
];

export function getBookingAction(id: BookingActionId): BookingActionDef {
  const action = BOOKING_ACTIONS.find((a) => a.id === id);
  if (!action) throw new Error(`Unknown booking action: ${id}`);
  return action;
}

/**
 * The actions offered for a booking right now: legal by the state machine,
 * sensible for the product kind, and permitted for the caller.
 */
export function availableBookingActions(
  booking: { status: BookingStatus; productKind: ProductKind },
  can: (permission: string) => boolean = () => true,
): BookingActionDef[] {
  return BOOKING_ACTIONS.filter((action) => {
    if (!action.from.includes(booking.status)) return false;
    if (!canTransition(booking.status, action.to)) return false;
    if (action.id === "check_in" && !hasCheckIn(booking.productKind)) return false;
    return can(action.permission);
  });
}

// ---------------------------------------------------------------------------
// Payment ↔ booking coupling
// ---------------------------------------------------------------------------

/**
 * The payment status implied by a booking transition.
 *
 * This encodes the distinction the brief calls out: a *booking* failure after
 * capture leaves the payment `captured` (money is with the platform, so a
 * refund is owed), while a *payment* failure leaves it `failed` and nothing is
 * owed. `null` means "leave the payment alone".
 */
export function paymentStatusForBooking(
  to: BookingStatus,
  current: PaymentStatus,
  failureReason?: BookingFailureReason,
): PaymentStatus | null {
  switch (to) {
    case "payment_pending":
      return "pending";
    case "payment_processing":
      return "processing";
    case "confirmed":
      return current === "captured" ? null : "captured";
    case "failed":
      // Payment-side failures kill the charge; provider-side failures don't —
      // the money was already captured and must be refunded.
      if (failureReason === "payment_failed" || failureReason === "payment_declined") {
        return "failed";
      }
      return current === "captured" ? "captured" : "voided";
    case "refund_pending":
      return "refund_pending";
    case "refunded":
      return "refunded";
    default:
      return null;
  }
}

/** True when money is sitting with the platform and a refund is owed. */
export function refundIsOwed(booking: {
  status: BookingStatus;
  payment: { status: PaymentStatus };
  money: { total: number; refunded: number };
}): boolean {
  const captured =
    booking.payment.status === "captured" ||
    booking.payment.status === "partially_refunded";
  const terminated = TERMINAL_FAILURE_STATUSES.includes(booking.status);
  return captured && terminated && booking.money.refunded < booking.money.total;
}

// ---------------------------------------------------------------------------
// Cancellation policies
// ---------------------------------------------------------------------------

/**
 * Cancellation policies as data. Tiers are evaluated most-generous-first by
 * {@link import("./money").quoteRefund}.
 */
export const CANCELLATION_POLICIES: Record<CancellationPolicyId, CancellationPolicy> = {
  flexible: {
    id: "flexible",
    label: "Flexible",
    summary: "Free cancellation up to 24 hours before start. 90% refund after that.",
    tiers: [
      { hoursBefore: 24, refundPercent: 1, feePercent: 0 },
      { hoursBefore: 0, refundPercent: 0.9, feePercent: 0.1 },
    ],
  },
  moderate: {
    id: "moderate",
    label: "Moderate",
    summary:
      "Full refund up to 7 days before start, 50% up to 48 hours, none after.",
    tiers: [
      { hoursBefore: 168, refundPercent: 1, feePercent: 0 },
      { hoursBefore: 48, refundPercent: 0.5, feePercent: 0.5 },
      { hoursBefore: 0, refundPercent: 0, feePercent: 1 },
    ],
  },
  strict: {
    id: "strict",
    label: "Strict",
    summary: "50% refund up to 14 days before start. No refund after that.",
    tiers: [
      { hoursBefore: 336, refundPercent: 0.5, feePercent: 0.5 },
      { hoursBefore: 0, refundPercent: 0, feePercent: 1 },
    ],
  },
  non_refundable: {
    id: "non_refundable",
    label: "Non-refundable",
    summary: "This rate cannot be refunded once confirmed.",
    tiers: [{ hoursBefore: 0, refundPercent: 0, feePercent: 1 }],
  },
};

export const CANCELLATION_POLICY_LIST = Object.values(CANCELLATION_POLICIES);

export function getCancellationPolicy(id: CancellationPolicyId): CancellationPolicy {
  return CANCELLATION_POLICIES[id] ?? CANCELLATION_POLICIES.moderate;
}
