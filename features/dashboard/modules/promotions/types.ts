import type { StatusDef } from "../../lib/status";

export const PROMOTION_STATUS_VALUES = [
  "scheduled",
  "active",
  "paused",
  "expired",
] as const;
export type PromotionStatus = (typeof PROMOTION_STATUS_VALUES)[number];

export type DiscountType = "percent" | "fixed";

export interface Promotion {
  id: string;
  code: string;
  name: string;
  type: string;
  discountType: DiscountType;
  value: number;
  currency: string;
  status: PromotionStatus;
  startsAt: string;
  endsAt: string;
  redemptions: number;
}

export const PROMOTION_STATUSES: readonly StatusDef<PromotionStatus>[] = [
  { value: "scheduled", label: "Scheduled", tone: "info" },
  { value: "active", label: "Active", tone: "success" },
  { value: "paused", label: "Paused", tone: "warning" },
  { value: "expired", label: "Expired", tone: "neutral" },
];
