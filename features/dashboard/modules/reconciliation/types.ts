import type { StatusDef } from "../../lib/status";

export const RECONCILIATION_STATUS_VALUES = [
  "balanced",
  "variance",
  "pending",
] as const;
export type ReconciliationStatus =
  (typeof RECONCILIATION_STATUS_VALUES)[number];

export interface ReconciliationBatch {
  id: string;
  reference: string;
  gateway: string;
  period: string;
  /** Amount the platform expected to settle. */
  expected: number;
  /** Amount the gateway actually reported. */
  settled: number;
  /** settled − expected (signed). */
  variance: number;
  matched: number;
  unmatched: number;
  currency: string;
  status: ReconciliationStatus;
  runAt: string;
}

export interface ReconciliationSummary {
  batches: number;
  unmatchedItems: number;
  totalVariance: number;
  balancedRate: number;
  currency: string;
}

export const RECONCILIATION_STATUSES: readonly StatusDef<ReconciliationStatus>[] = [
  { value: "balanced", label: "Balanced", tone: "success" },
  { value: "variance", label: "Variance", tone: "danger" },
  { value: "pending", label: "Pending", tone: "warning" },
];
