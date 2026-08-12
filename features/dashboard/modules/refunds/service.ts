/** Refunds data source — the domain refund service plus this module's keys. */

export { refundService } from "../../domain/services";

export const refundKeys = {
  all: ["finance", "refunds"] as const,
  summary: () => ["finance", "refunds", "summary"] as const,
  detail: (id: string) => ["finance", "refunds", "detail", id] as const,
};

/** A refund decision moves booking, commission and settlement state too. */
export const REFUND_SIDE_EFFECT_KEYS = [
  ["finance", "refunds"],
  ["bookings"],
  ["finance", "commission"],
  ["finance", "settlements"],
  ["notifications"],
  ["logs"],
  ["overview"],
] as const;
