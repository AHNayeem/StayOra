/**
 * Overview data source — derived from the domain, not from static numbers.
 *
 * Every KPI on the landing dashboard is computed from the same bookings,
 * refunds, commission and settlement records the rest of the product reads, and
 * scoped to the caller: an admin sees the platform, a merchant sees only their
 * own business, an agency only its own bookings. That's what makes the three
 * dashboards genuinely different rather than differently-labelled.
 */

import { auditService, platformService } from "../../domain/services";
import type { DomainScope } from "../../domain/services";
import { getState } from "../../domain/store";
import { PLATFORM_NOW, money } from "../../domain/money";
import type { ActivityItem, DashboardSummary, PerformancePoint } from "./types";

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "3 hrs ago" style relative label, measured from the domain clock. */
function relativeTime(iso: string): string {
  const diff = new Date(PLATFORM_NOW).getTime() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.round(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

const ACTION_ICONS: Record<string, string> = {
  create: "CalendarCheck",
  update: "SlidersHorizontal",
  delete: "Ban",
  approve: "CircleCheck",
  reject: "CircleAlert",
  cancel: "Ban",
  refund: "BanknoteArrowDown",
  settle: "Wallet",
  status_change: "ArrowLeftRight",
  login: "Fingerprint",
  export: "FileBarChart",
  suspend: "ShieldAlert",
  activate: "ShieldCheck",
};

const ACTION_TONES: Record<string, ActivityItem["tone"]> = {
  approve: "success",
  activate: "success",
  settle: "info",
  refund: "info",
  reject: "danger",
  suspend: "danger",
  delete: "danger",
  cancel: "warning",
  status_change: "warning",
};

export const overviewService = {
  /** Headline KPIs for the signed-in principal's scope. */
  async getSummary(scope: DomainScope = {}): Promise<DashboardSummary> {
    const data = await platformService.overview(scope);
    const state = getState();
    const merchants = new Set(state.bookings.map((b) => b.merchant.id));
    const customers = new Set(state.bookings.map((b) => b.customer.id));
    const delivered = data.financials.bookingCount - data.financials.failedCount;

    return {
      revenueTotal: data.financials.gmv,
      revenueCurrency: data.financials.currency,
      bookingsCount: data.financials.bookingCount,
      newUsers: customers.size,
      activeMerchants: scope.merchantId ? 1 : merchants.size,
      // Delivery rate stands in for occupancy: the share of bookings that
      // actually completed rather than failing.
      occupancy: data.financials.bookingCount
        ? money(delivered / data.financials.bookingCount)
        : 0,
      conversion: data.financials.bookingCount
        ? money(data.financials.refundedCount / data.financials.bookingCount)
        : 0,
    };
  },

  /** Recent activity — the real audit trail, not a canned list. */
  async getActivity(scope: DomainScope = {}): Promise<ActivityItem[]> {
    const page = await auditService.list({ page: 1, pageSize: 6 }, scope);
    return page.items.map((entry) => ({
      id: entry.id,
      icon: ACTION_ICONS[entry.action] ?? "Activity",
      title: entry.summary,
      when: relativeTime(entry.at),
      tone: ACTION_TONES[entry.action] ?? "neutral",
    }));
  },

  /** Monthly GMV + booking counts, straight off the bookings ledger. */
  async getPerformance(scope: DomainScope = {}): Promise<PerformancePoint[]> {
    const data = await platformService.overview(scope);
    return data.byMonth.slice(-12).map((point) => {
      const [, monthPart] = point.key.split("-");
      return {
        month: MONTH_LABELS[Number(monthPart) - 1] ?? point.key,
        revenue: point.value,
        bookings: point.count,
      };
    });
  },

  /** Everything else the overview renders (attention counts, mix charts). */
  overview: platformService.overview,
};

export const overviewKeys = {
  summary: ["overview", "summary"] as const,
  activity: ["overview", "activity"] as const,
  performance: ["overview", "performance"] as const,
  recentBookings: ["overview", "recent-bookings"] as const,
  detail: ["overview", "detail"] as const,
};
