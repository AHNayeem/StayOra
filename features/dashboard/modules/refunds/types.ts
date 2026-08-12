/**
 * Refunds module types.
 *
 * The refund model and its state machine live in the domain layer, because the
 * customer raises refunds, the merchant sees them deducted from settlement and
 * the platform decides them — one record, three surfaces.
 */

export type {
  Refund,
  RefundKind,
  RefundQuote,
  RefundReason,
  RefundStatus,
} from "../../domain/types";

export { REFUND_STATUSES, REFUND_TRANSITIONS } from "../../domain/lifecycle";

import type { SelectOption } from "@/components/ui/select";
import type { RefundKind, RefundReason } from "../../domain/types";

export const REFUND_REASON_LABELS: Record<RefundReason, string> = {
  customer_cancellation: "Customer cancellation",
  booking_failed: "Booking failed (no capture)",
  payment_captured_booking_failed: "Captured but booking failed",
  merchant_cancellation: "Merchant cancellation",
  duplicate_booking: "Duplicate booking",
  service_not_as_described: "Service not as described",
  overcharge: "Overcharge",
  goodwill: "Goodwill",
};

export const REFUND_REASON_OPTIONS: SelectOption[] = Object.entries(
  REFUND_REASON_LABELS,
).map(([value, label]) => ({ value, label }));

export const REFUND_KIND_LABELS: Record<RefundKind, string> = {
  full: "Full refund",
  partial: "Partial refund",
  none: "No refund",
};

export const REFUND_KIND_OPTIONS: SelectOption[] = Object.entries(
  REFUND_KIND_LABELS,
).map(([value, label]) => ({ value, label }));
