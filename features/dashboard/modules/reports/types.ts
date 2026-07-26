/** Reports module data contracts. */

export interface ReportSummary {
  totalRevenue: number;
  totalBookings: number;
  totalRefunds: number;
  net: number;
  currency: string;
}

export interface ReportRow {
  period: string;
  bookings: number;
  revenue: number;
  refunds: number;
  net: number;
  currency: string;
}

/** A selectable saved-report definition. */
export interface ReportDef {
  id: string;
  name: string;
  description: string;
}

export const REPORT_DEFS: readonly ReportDef[] = [
  { id: "revenue", name: "Revenue summary", description: "Gross revenue, refunds and net by period." },
  { id: "bookings", name: "Bookings volume", description: "Confirmed bookings by period." },
  { id: "merchants", name: "Merchant performance", description: "Revenue and payouts by merchant." },
  { id: "refunds", name: "Refund analysis", description: "Refund rate and reasons by period." },
];

export const REPORT_RANGES: readonly { value: string; label: string }[] = [
  { value: "3m", label: "Last 3 months" },
  { value: "6m", label: "Last 6 months" },
  { value: "12m", label: "Last 12 months" },
];
