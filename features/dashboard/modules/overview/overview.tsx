"use client";

import Link from "next/link";
import { useQuery } from "../../data";
import type { ListParams, Paginated } from "../../data";
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
import { bookingsService } from "../bookings/service";
import { BOOKING_STATUSES, type Booking } from "../bookings/types";
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
  { id: "guest", header: "Guest", cell: (b) => b.guestName },
  {
    id: "amount",
    header: "Amount",
    align: "right",
    cell: (b) => (
      <span className="tabular-nums">{formatCurrency(b.amount, b.currency)}</span>
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

const RECENT_PARAMS: ListParams = {
  page: 1,
  pageSize: 5,
  sort: { field: "createdAt", direction: "desc" },
};

/** Dashboard overview — KPI grid, performance chart, recent bookings + activity. */
export function DashboardOverview() {
  const summary = useQuery({
    queryKey: overviewKeys.summary,
    queryFn: () => overviewService.getSummary(),
    staleTime: 60_000,
  });
  const activity = useQuery({
    queryKey: overviewKeys.activity,
    queryFn: () => overviewService.getActivity(),
    staleTime: 60_000,
  });
  const performance = useQuery({
    queryKey: overviewKeys.performance,
    queryFn: () => overviewService.getPerformance(),
    staleTime: 60_000,
  });
  const recent = useQuery<Paginated<Booking>>({
    queryKey: overviewKeys.recentBookings,
    queryFn: (signal) => bookingsService.list(RECENT_PARAMS, signal),
    staleTime: 60_000,
  });

  const s = summary.data;
  const kpis = s
    ? [
        { label: "Revenue", value: formatCurrency(s.revenueTotal, s.revenueCurrency), icon: "Wallet" },
        { label: "Bookings", value: formatNumber(s.bookingsCount), icon: "CalendarCheck" },
        { label: "New users", value: formatNumber(s.newUsers), icon: "Users" },
        { label: "Active merchants", value: formatNumber(s.activeMerchants), icon: "Store" },
        { label: "Occupancy", value: formatPercent(s.occupancy), icon: "LineChart" },
        { label: "Conversion", value: formatPercent(s.conversion), icon: "BadgePercent" },
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
            rows={recent.data?.items ?? []}
            getRowId={(b) => b.id}
            loading={recent.isLoading}
            error={recent.isError ? "Couldn't load recent bookings." : null}
            onRetry={recent.refetch}
            caption="Recent bookings"
            density="compact"
          />
        </div>
      </Panel>
    </div>
  );
}
