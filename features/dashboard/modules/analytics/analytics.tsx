"use client";

import { useQuery } from "../../data";
import {
  ChartCard,
  StatCard,
  StatCardSkeleton,
  TrendChart,
  CategoryBarChart,
  DonutChart,
  CHART_COLORS,
  compactNumber,
  type ChartSeries,
} from "../../ui";
import { formatCurrency, formatNumber, formatPercent } from "../../lib/format";
import { analyticsKeys, analyticsService } from "./service";

const REVENUE_SERIES: ChartSeries[] = [
  {
    key: "revenue",
    label: "Revenue",
    color: CHART_COLORS.primary,
    type: "area",
    format: (v) => formatCurrency(v, "USD"),
  },
];

/** Signed percentage note for a KPI card, e.g. "+8.2% vs last period". */
function delta(pct: number): string {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}% vs last period`;
}

/** Platform analytics — traffic, revenue trend, conversion funnel and mix. */
export function AnalyticsDashboard() {
  const summary = useQuery({
    queryKey: analyticsKeys.summary,
    queryFn: () => analyticsService.getSummary(),
    staleTime: 60_000,
  });
  const revenue = useQuery({
    queryKey: analyticsKeys.revenue,
    queryFn: () => analyticsService.getRevenueTrend(),
    staleTime: 60_000,
  });
  const traffic = useQuery({
    queryKey: analyticsKeys.traffic,
    queryFn: () => analyticsService.getTrafficSources(),
    staleTime: 60_000,
  });
  const categories = useQuery({
    queryKey: analyticsKeys.categories,
    queryFn: () => analyticsService.getBookingsByCategory(),
    staleTime: 60_000,
  });
  const funnel = useQuery({
    queryKey: analyticsKeys.funnel,
    queryFn: () => analyticsService.getFunnel(),
    staleTime: 60_000,
  });

  const s = summary.data;
  const kpis = s
    ? [
        {
          label: "Sessions",
          value: formatNumber(s.sessions),
          icon: "Users",
          hint: delta(s.deltas.sessions),
        },
        {
          label: "Conversion",
          value: formatPercent(s.conversion),
          icon: "BadgePercent",
          hint: delta(s.deltas.conversion),
        },
        {
          label: "Avg. order value",
          value: formatCurrency(s.avgOrderValue, s.currency),
          icon: "Wallet",
          hint: delta(s.deltas.avgOrderValue),
        },
        {
          label: "Bookings",
          value: formatNumber(s.bookings),
          icon: "CalendarCheck",
          hint: delta(s.deltas.bookings),
        },
      ]
    : [];

  const trafficTotal = (traffic.data ?? []).reduce((sum, t) => sum + t.value, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.isLoading
          ? Array.from({ length: 4 }, (_, i) => <StatCardSkeleton key={i} />)
          : kpis.map((kpi) => <StatCard key={kpi.label} {...kpi} />)}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Revenue trend"
          description="Gross booking value over the last 12 months"
          loading={revenue.isLoading}
          empty={revenue.isSuccess && (revenue.data?.length ?? 0) === 0}
        >
          <TrendChart
            data={revenue.data ?? []}
            xKey="month"
            series={REVENUE_SERIES}
            height={280}
            leftTickFormatter={(v) => `$${Math.round(v / 1000)}k`}
          />
        </ChartCard>

        <ChartCard
          title="Traffic sources"
          description="Where sessions come from"
          loading={traffic.isLoading}
          empty={traffic.isSuccess && (traffic.data?.length ?? 0) === 0}
        >
          <DonutChart
            data={traffic.data ?? []}
            height={220}
            centerValue={compactNumber(trafficTotal)}
            centerLabel="sessions"
            valueFormatter={(v) => formatNumber(v)}
          />
          <ul className="mt-4 flex flex-col gap-2">
            {(traffic.data ?? []).map((t) => (
              <li key={t.name} className="flex items-center gap-2 text-sm">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: t.color }}
                  aria-hidden="true"
                />
                <span className="text-body">{t.name}</span>
                <span className="ml-auto font-medium tabular-nums text-ink">
                  {trafficTotal > 0 ? Math.round((t.value / trafficTotal) * 100) : 0}%
                </span>
              </li>
            ))}
          </ul>
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Bookings by category"
          description="Volume across verticals this period"
          loading={categories.isLoading}
          empty={categories.isSuccess && (categories.data?.length ?? 0) === 0}
        >
          <CategoryBarChart
            data={categories.data ?? []}
            xKey="category"
            valueKey="bookings"
            label="Bookings"
            horizontal
            height={280}
            valueFormatter={(v) => formatNumber(v)}
          />
        </ChartCard>

        <ChartCard
          title="Conversion funnel"
          description="From session to confirmed booking"
          loading={funnel.isLoading}
          empty={funnel.isSuccess && (funnel.data?.length ?? 0) === 0}
        >
          <CategoryBarChart
            data={funnel.data ?? []}
            xKey="stage"
            valueKey="count"
            label="Users"
            color={CHART_COLORS.accent}
            horizontal
            height={280}
            valueFormatter={(v) => formatNumber(v)}
          />
        </ChartCard>
      </div>
    </div>
  );
}
