import type { ReportRow, ReportSummary } from "./types";

// Deterministic fixtures — SSR and client render identically. The shapes mirror
// what a reporting API would return; swap the body for `httpClient` calls later.

const ROWS: ReportRow[] = [
  { period: "Aug 2025", bookings: 412, revenue: 148_200, refunds: 6_100, net: 142_100, currency: "USD" },
  { period: "Sep 2025", bookings: 389, revenue: 139_500, refunds: 4_800, net: 134_700, currency: "USD" },
  { period: "Oct 2025", bookings: 447, revenue: 161_900, refunds: 7_300, net: 154_600, currency: "USD" },
  { period: "Nov 2025", bookings: 501, revenue: 182_400, refunds: 5_200, net: 177_200, currency: "USD" },
  { period: "Dec 2025", bookings: 578, revenue: 214_800, refunds: 9_100, net: 205_700, currency: "USD" },
  { period: "Jan 2026", bookings: 463, revenue: 168_300, refunds: 6_400, net: 161_900, currency: "USD" },
  { period: "Feb 2026", bookings: 441, revenue: 159_700, refunds: 5_900, net: 153_800, currency: "USD" },
  { period: "Mar 2026", bookings: 496, revenue: 179_600, refunds: 6_800, net: 172_800, currency: "USD" },
  { period: "Apr 2026", bookings: 524, revenue: 191_200, refunds: 7_100, net: 184_100, currency: "USD" },
  { period: "May 2026", bookings: 559, revenue: 205_400, refunds: 8_300, net: 197_100, currency: "USD" },
  { period: "Jun 2026", bookings: 601, revenue: 223_900, refunds: 9_600, net: 214_300, currency: "USD" },
  { period: "Jul 2026", bookings: 572, revenue: 212_100, refunds: 7_800, net: 204_300, currency: "USD" },
];

function delay<T>(value: T, ms = 500): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/** Number of trailing months for a range key. */
function monthsFor(range: string): number {
  if (range === "3m") return 3;
  if (range === "6m") return 6;
  return 12;
}

/** Reports data source (stub; repository-ready). */
export const reportsService = {
  getRows: (range = "12m"): Promise<ReportRow[]> =>
    delay(ROWS.slice(-monthsFor(range))),
  getSummary: (range = "12m"): Promise<ReportSummary> => {
    const rows = ROWS.slice(-monthsFor(range));
    const summary = rows.reduce<ReportSummary>(
      (acc, r) => ({
        totalRevenue: acc.totalRevenue + r.revenue,
        totalBookings: acc.totalBookings + r.bookings,
        totalRefunds: acc.totalRefunds + r.refunds,
        net: acc.net + r.net,
        currency: r.currency,
      }),
      { totalRevenue: 0, totalBookings: 0, totalRefunds: 0, net: 0, currency: "USD" },
    );
    return delay(summary);
  },
};

export const reportKeys = {
  rows: (range: string) => ["reports", "rows", range] as const,
  summary: (range: string) => ["reports", "summary", range] as const,
};
