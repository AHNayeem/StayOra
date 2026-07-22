import type { StatusDef } from "../../lib/status";

export const MERCHANT_STATUS_VALUES = [
  "pending",
  "active",
  "suspended",
  "rejected",
] as const;

export type MerchantStatus = (typeof MERCHANT_STATUS_VALUES)[number];

export interface Merchant {
  id: string;
  name: string;
  email: string;
  contactName: string;
  category: string;
  country: string;
  properties: number;
  /** Commission rate as a 0–1 ratio. */
  commissionRate: number;
  revenue: number;
  currency: string;
  status: MerchantStatus;
  joinedAt: string;
}

export interface CreateMerchantInput {
  name: string;
  email: string;
  contactName: string;
  category: string;
  country: string;
  commissionRate: number;
}

export const MERCHANT_STATUSES: readonly StatusDef<MerchantStatus>[] = [
  { value: "pending", label: "Pending", tone: "warning" },
  { value: "active", label: "Active", tone: "success" },
  { value: "suspended", label: "Suspended", tone: "danger" },
  { value: "rejected", label: "Rejected", tone: "neutral" },
];
