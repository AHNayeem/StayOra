/**
 * Reports module data contracts.
 *
 * A report is a definition plus a result: the definition says what it is and
 * which filters it honours, the result carries its own columns so one view can
 * render every report without a per-report component.
 */

export type ReportColumnFormat =
  | "text"
  | "number"
  | "currency"
  | "percent"
  | "date"
  | "month";

export interface ReportColumn {
  key: string;
  header: string;
  format?: ReportColumnFormat;
  align?: "left" | "right";
}

export type ReportCell = string | number | null | undefined;

export interface ReportRow {
  [key: string]: ReportCell;
}

/** A headline figure shown above the table. */
export interface ReportStat {
  label: string;
  value: string;
  icon: string;
  hint?: string;
}

/** One point on a report's trend chart. */
export interface ReportTrendPoint {
  period: string;
  value: number;
  secondary?: number;
}

export interface ReportResult {
  id: string;
  name: string;
  description: string;
  currency: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  stats: ReportStat[];
  trend: ReportTrendPoint[];
  /** Legend labels for the trend chart's two series. */
  trendLabels: { primary: string; secondary?: string };
  /** Rendered under the table — how the numbers were derived. */
  note?: string;
}

/** A selectable saved-report definition. */
export interface ReportDef {
  id: string;
  name: string;
  description: string;
  /** Grouping in the report picker. */
  group: "Platform" | "Merchant" | "Partner" | "Operations";
}

export const REPORT_DEFS: readonly ReportDef[] = [
  {
    id: "platform-revenue",
    name: "Platform Revenue Report",
    description: "Every platform revenue source by month, net of reversals.",
    group: "Platform",
  },
  {
    id: "commission",
    name: "Commission Report",
    description: "Commission accrued, reversed and settled, by merchant.",
    group: "Platform",
  },
  {
    id: "insurance-revenue",
    name: "Insurance Revenue Report",
    description: "Premium, provider payable and platform margin by plan.",
    group: "Partner",
  },
  {
    id: "membership-revenue",
    name: "Membership Revenue Report",
    description: "Subscriptions, revenue and churn by plan.",
    group: "Platform",
  },
  {
    id: "advertising-revenue",
    name: "Advertising Campaign Revenue Report",
    description: "Delivery, spend and recognised revenue by campaign.",
    group: "Partner",
  },
  {
    id: "b2b-revenue",
    name: "B2B Revenue Report",
    description: "Volume, markup, platform margin and outstanding credit by account.",
    group: "Partner",
  },
  {
    id: "merchant-settlement",
    name: "Merchant Settlement Report",
    description: "Gross sales, commission, refunds and net payable by merchant.",
    group: "Merchant",
  },
  {
    id: "payout",
    name: "Payout Report",
    description: "Every settlement batch and where it is in the payout chain.",
    group: "Merchant",
  },
  {
    id: "refund-reversal",
    name: "Refund & Commission Reversal Report",
    description: "Refunds paid and the commission given back with them.",
    group: "Operations",
  },
  {
    id: "revenue-management",
    name: "Revenue Management Report",
    description: "Room nights, ADR, lead time and cancellation rate by month.",
    group: "Operations",
  },
];

export const REPORT_RANGES: readonly { value: string; label: string }[] = [
  { value: "3m", label: "Last 3 months" },
  { value: "6m", label: "Last 6 months" },
  { value: "12m", label: "Last 12 months" },
  { value: "all", label: "All time" },
];

/** Filters a report honours. Not every report uses every field. */
export interface ReportFilters {
  range?: string;
  from?: string;
  to?: string;
  merchantId?: string;
  organizationId?: string;
  segment?: string;
}
