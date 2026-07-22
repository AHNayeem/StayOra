import type { StatusDef } from "../../lib/status";

export const REVIEW_STATUS_VALUES = [
  "pending",
  "approved",
  "rejected",
  "reported",
] as const;
export type ReviewStatus = (typeof REVIEW_STATUS_VALUES)[number];

export interface Review {
  id: string;
  guest: string;
  property: string;
  rating: number;
  title: string;
  comment: string;
  status: ReviewStatus;
  createdAt: string;
}

export const REVIEW_STATUSES: readonly StatusDef<ReviewStatus>[] = [
  { value: "pending", label: "Pending", tone: "warning" },
  { value: "approved", label: "Approved", tone: "success" },
  { value: "rejected", label: "Rejected", tone: "neutral" },
  { value: "reported", label: "Reported", tone: "danger" },
];
