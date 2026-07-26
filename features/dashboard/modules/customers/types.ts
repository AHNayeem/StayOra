import type { StatusDef } from "../../lib/status";

export const CUSTOMER_STATUS_VALUES = ["active", "inactive", "blocked"] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUS_VALUES)[number];

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  /** Lifetime confirmed bookings (derived server-side). */
  bookings: number;
  /** Lifetime gross spend (derived server-side). */
  totalSpent: number;
  currency: string;
  status: CustomerStatus;
  joinedAt: string;
}

export const CUSTOMER_STATUSES: readonly StatusDef<CustomerStatus>[] = [
  { value: "active", label: "Active", tone: "success" },
  { value: "inactive", label: "Inactive", tone: "neutral" },
  { value: "blocked", label: "Blocked", tone: "danger" },
];
