"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { useQuery } from "../../data";
import {
  Button,
  ChartCard,
  Select,
  StatCard,
  StatCardSkeleton,
  TrendChart,
  CHART_COLORS,
  type ChartSeries,
} from "../../ui";
import { Can } from "../../rbac/permission-guard";
import { formatCurrency, formatNumber } from "../../lib/format";
import { exportToCsv } from "../../lib/export-csv";
import { reportKeys, reportsService } from "./service";
import { REPORT_DEFS, REPORT_RANGES, type ReportRow } from "./types";

const SERIES: ChartSeries[] = [
  {
    key: "revenue",
    label: "Revenue",
    color: CHART_COLORS.primary,
    type: "area",
    format: (v) => formatCurrency(v, "USD"),
  },
  {
    key: "net",
    label: "Net",
    color: CHART_COLORS.accent,
    type: "line",
    format: (v) => formatCurrency(v, "USD"),
  },
];

const REPORT_OPTIONS = REPORT_DEFS.map((r) => ({ value: r.id, label: r.name }));

/**
 * ReportsView — a lightweight report builder: pick a report and range, then read
 * KPI totals, a revenue/net trend and a per-period breakdown you can export.
 */
export function ReportsView() {
  const [report, setReport] = useState(REPORT_DEFS[0].id);
  const [range, setRange] = useState("12m");

  const summary = useQuery({
    queryKey: reportKeys.summary(range),
    queryFn: () => reportsService.getSummary(range),
    staleTime: 60_000,
  });
  const rows = useQuery({
    queryKey: reportKeys.rows(range),
    queryFn: () => reportsService.getRows(range),
    staleTime: 60_000,
  });

  const activeReport = REPORT_DEFS.find((r) => r.id === report) ?? REPORT_DEFS[0];
  const s = summary.data;
  const kpis = s
    ? [
        { label: "Revenue", value: formatCurrency(s.totalRevenue, s.currency), icon: "Wallet" },
        { label: "Bookings", value: formatNumber(s.totalBookings), icon: "CalendarCheck" },
        { label: "Refunds", value: formatCurrency(s.totalRefunds, s.currency), icon: "BadgePercent" },
        { label: "Net", value: formatCurrency(s.net, s.currency), icon: "LineChart" },
      ]
    : [];

  const handleExport = () => {
    exportToCsv<ReportRow>(`report-${report}-${range}`, rows.data ?? [], [
      { header: "Period", value: (r) => r.period },
      { header: "Bookings", value: (r) => r.bookings },
      { header: "Revenue", value: (r) => formatCurrency(r.revenue, r.currency) },
      { header: "Refunds", value: (r) => formatCurrency(r.refunds, r.currency) },
      { header: "Net", value: (r) => formatCurrency(r.net, r.currency) },
    ]);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Select
            label="Report"
            options={REPORT_OPTIONS}
            value={report}
            onChange={(e) => setReport(e.target.value)}
            wrapperClassName="sm:w-56"
          />
          <Select
            label="Range"
            options={[...REPORT_RANGES]}
            value={range}
            onChange={(e) => setRange(e.target.value)}
            wrapperClassName="sm:w-44"
          />
        </div>
        <Can anyPermission={["reports:export"]}>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="size-4" />}
            onClick={handleExport}
            disabled={(rows.data?.length ?? 0) === 0}
          >
            Export CSV
          </Button>
        </Can>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.isLoading
          ? Array.from({ length: 4 }, (_, i) => <StatCardSkeleton key={i} />)
          : kpis.map((kpi) => <StatCard key={kpi.label} {...kpi} />)}
      </div>

      <ChartCard
        title={activeReport.name}
        description={activeReport.description}
        loading={rows.isLoading}
        empty={rows.isSuccess && (rows.data?.length ?? 0) === 0}
      >
        <TrendChart
          data={rows.data ?? []}
          xKey="period"
          series={SERIES}
          height={300}
          leftTickFormatter={(v) => `$${Math.round(v / 1000)}k`}
        />
      </ChartCard>

      <div className="rounded-card border border-line bg-surface shadow-card">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-semibold text-ink">Breakdown by period</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-2xl border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="px-5 py-3 text-left font-medium">Period</th>
                <th className="px-5 py-3 text-right font-medium">Bookings</th>
                <th className="px-5 py-3 text-right font-medium">Revenue</th>
                <th className="px-5 py-3 text-right font-medium">Refunds</th>
                <th className="px-5 py-3 text-right font-medium">Net</th>
              </tr>
            </thead>
            <tbody>
              {(rows.data ?? []).map((r) => (
                <tr key={r.period} className="border-b border-line last:border-0">
                  <td className="px-5 py-2.5 font-medium text-ink">{r.period}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums text-body">
                    {formatNumber(r.bookings)}
                  </td>
                  <td className="px-5 py-2.5 text-right tabular-nums text-body">
                    {formatCurrency(r.revenue, r.currency)}
                  </td>
                  <td className="px-5 py-2.5 text-right tabular-nums text-body">
                    {formatCurrency(r.refunds, r.currency)}
                  </td>
                  <td className="px-5 py-2.5 text-right font-medium tabular-nums text-ink">
                    {formatCurrency(r.net, r.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
