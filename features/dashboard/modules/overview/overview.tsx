"use client";

import Link from "next/link";
import { useQuery } from "../../data";
import {
  ChartCard,
  DataTable,
  Panel,
  StatCard,
  StatCardSkeleton,
  StatusBadge,
  SkeletonText,
  ErrorState,
  TrendChart,
  CHART_COLORS,
  type ChartSeries,
  type ColumnDef,
} from "../../ui";
import { DashboardIcon } from "../../navigation/dashboard-icons";
import { formatCurrency, formatNumber, formatPercent } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { BOOKING_STATUSES } from "../../domain/lifecycle";
import type { Booking } from "../../domain/types";
import { useDomainScope, useRoleView } from "../../domain/use-domain";
import { overviewKeys, overviewService } from "./service";

const bookingTone = toneMap(BOOKING_STATUSES);
const bookingLabel = labelMap(BOOKING_STATUSES);

const PERFORMANCE_SERIES: ChartSeries[] = [
  {
    key: "revenue",
    label: "Revenue",
    color: CHART_COLORS.primary,
    type: "area",
    axis: "left",
    format: (v) => formatCurrency(v, "USD"),
  },
  {
    key: "bookings",
    label: "Bookings",
    color: CHART_COLORS.accent,
    type: "line",
    axis: "right",
    format: (v) => formatNumber(v),
  },
];

const recentColumns: ColumnDef<Booking>[] = [
  {
    id: "reference",
    header: "Reference",
    cell: (b) => <span className="font-medium text-ink">{b.reference}</span>,
  },
  { id: "customer", header: "Customer", cell: (b) => b.customer.name },
  {
    id: "segment",
    header: "Segment",
    cell: (b) => (
      <span className="text-xs font-semibold uppercase text-muted">{b.segment}</span>
    ),
  },
  {
    id: "amount",
    header: "Amount",
    align: "right",
    cell: (b) => (
      <span className="tabular-nums">
        {formatCurrency(b.money.total, b.money.currency)}
      </span>
    ),
  },
  {
    id: "commission",
    header: "Commission",
    align: "right",
    cell: (b) => (
      <span className="tabular-nums text-body">
        {formatCurrency(b.money.commission, b.money.currency)}
      </span>
    ),
  },
  {
    id: "status",
    header: "Status",
    cell: (b) => (
      <StatusBadge tone={bookingTone[b.status]}>{bookingLabel[b.status]}</StatusBadge>
    ),
  },
];

/** Dashboard overview — KPI grid, performance chart, recent bookings + activity. */
export function DashboardOverview() {
  const scope = useDomainScope();
  const { isMerchant, isAgency } = useRoleView();
  const scopeKey = scope.merchantId ?? scope.organizationId ?? "platform";

  const summary = useQuery({
    queryKey: [...overviewKeys.summary, scopeKey],
    queryFn: () => overviewService.getSummary(scope),
    staleTime: 15_000,
  });
  const activity = useQuery({
    queryKey: [...overviewKeys.activity, scopeKey],
    queryFn: () => overviewService.getActivity(scope),
    staleTime: 15_000,
  });
  const performance = useQuery({
    queryKey: [...overviewKeys.performance, scopeKey],
    queryFn: () => overviewService.getPerformance(scope),
    staleTime: 15_000,
  });
  const detail = useQuery({
    queryKey: [...overviewKeys.detail, scopeKey],
    queryFn: () => overviewService.overview(scope),
    staleTime: 15_000,
  });

  const s = summary.data;
  const f = detail.data?.financials;
  const recentRows: Booking[] = detail.data?.recentBookings.slice(0, 5) ?? [];

  /**
   * KPIs differ by role because the businesses differ: a merchant cares about
   * what they earn, the platform about what it takes, an agency about what it
   * owes. All three read from the same financial roll-up.
   */
  const kpis =
    s && f
      ? isMerchant
        ? [
            { label: "Gross sales", value: formatCurrency(f.netSales, f.currency), icon: "Wallet" },
            { label: "Bookings", value: formatNumber(f.bookingCount), icon: "CalendarCheck" },
            { label: "Commission paid", value: formatCurrency(f.commission, f.currency), icon: "Percent" },
            { label: "Net earnings", value: formatCurrency(f.merchantEarnings, f.currency), icon: "PiggyBank" },
            { label: "Refunds", value: formatCurrency(f.refunds, f.currency), icon: "BanknoteArrowDown" },
            { label: "Delivery rate", value: formatPercent(s.occupancy), icon: "LineChart" },
          ]
        : isAgency
          ? [
            { label: "Booked value", value: formatCurrency(f.gmv, f.currency), icon: "Wallet" },
            { label: "Bookings", value: formatNumber(f.bookingCount), icon: "CalendarCheck" },
            { label: "Net rate value", value: formatCurrency(f.netSales, f.currency), icon: "Handshake" },
            { label: "Failed bookings", value: formatNumber(f.failedCount), icon: "CircleAlert" },
            { label: "Refunded", value: formatCurrency(f.refunds, f.currency), icon: "BanknoteArrowDown" },
            { label: "Delivery rate", value: formatPercent(s.occupancy), icon: "LineChart" },
          ]
          : [
            { label: "GMV", value: formatCurrency(f.gmv, f.currency), icon: "Wallet" },
            { label: "Bookings", value: formatNumber(f.bookingCount), icon: "CalendarCheck" },
            { label: "Platform revenue", value: formatCurrency(f.platformRevenue, f.currency), icon: "CircleDollarSign" },
            { label: "Take rate", value: `${f.takeRate}%`, icon: "Percent" },
            { label: "Merchant earnings", value: formatCurrency(f.merchantEarnings, f.currency), icon: "Store" },
            { label: "Needs attention", value: formatNumber(detail.data?.needsAttention ?? 0), icon: "TriangleAlert" },
          ]
      : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {summary.isLoading
          ? Array.from({ length: 6 }, (_, i) => <StatCardSkeleton key={i} />)
          : kpis.map((kpi) => <StatCard key={kpi.label} {...kpi} />)}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Performance"
          description="Revenue & bookings over the last 12 months"
          loading={performance.isLoading}
          empty={performance.isSuccess && (performance.data?.length ?? 0) === 0}
          legend={[
            { label: "Revenue", colorClass: "bg-primary" },
            { label: "Bookings", colorClass: "bg-accent" },
          ]}
        >
          <TrendChart
            data={performance.data ?? []}
            xKey="month"
            series={PERFORMANCE_SERIES}
            dualAxis
            height={260}
            leftTickFormatter={(v) => `$${Math.round(v / 1000)}k`}
          />
        </ChartCard>

        <Panel flush>
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-base font-semibold text-ink">Recent activity</h2>
            <p className="mt-0.5 text-sm text-body">Latest platform events</p>
          </div>
          <div className="p-2">
            {activity.isLoading ? (
              <div className="p-3">
                <SkeletonText lines={5} />
              </div>
            ) : activity.isError ? (
              <ErrorState description="Couldn't load activity." onRetry={activity.refetch} />
            ) : (
              <ul className="flex flex-col">
                {activity.data?.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-3 rounded-field px-3 py-2.5 hover:bg-surface-muted"
                  >
                    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-field bg-surface-muted text-body">
                      <DashboardIcon name={item.icon} className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink">{item.title}</p>
                      <p className="text-xs text-muted">{item.when}</p>
                    </div>
                    <StatusBadge tone={item.tone} dot={false}>
                      {item.tone}
                    </StatusBadge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>
      </div>

      <Panel flush>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-ink">Recent bookings</h2>
            <p className="mt-0.5 text-sm text-body">The latest reservations</p>
          </div>
          <Link
            href="/dashboard/bookings"
            className="text-sm font-semibold text-primary hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="p-4">
          <DataTable<Booking>
            columns={recentColumns}
            rows={recentRows}
            getRowId={(b) => b.id}
            loading={detail.isLoading}
            error={detail.isError ? "Couldn't load recent bookings." : null}
            onRetry={detail.refetch}
            caption="Recent bookings"
            density="compact"
          />
        </div>
      </Panel>
    </div>
  );
}
