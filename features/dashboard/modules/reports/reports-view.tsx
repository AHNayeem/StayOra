"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { useQuery } from "../../data";
import {
  Alert,
  Button,
  CHART_COLORS,
  ChartCard,
  DataTable,
  EmptyState,
  Input,
  Select,
  StatCard,
  StatCardSkeleton,
  TrendChart,
  type ChartSeries,
  type ColumnDef,
} from "../../ui";
import { Can } from "../../rbac/permission-guard";
import { formatCurrency, formatDate, formatNumber } from "../../lib/format";
import { exportToCsv } from "../../lib/export-csv";
import { MERCHANTS } from "../../domain/seed";
import { useDomainScope } from "../../domain/use-domain";
import { reportKeys, reportsService } from "./service";
import {
  REPORT_DEFS,
  REPORT_RANGES,
  type ReportCell,
  type ReportColumn,
  type ReportFilters,
  type ReportRow,
} from "./types";

/** Format one cell by its column's declared format. */
function renderCell(value: ReportCell, column: ReportColumn, currency: string): string {
  if (value === null || value === undefined || value === "") return "—";
  switch (column.format) {
    case "currency":
      return formatCurrency(Number(value), currency);
    case "number":
      return formatNumber(Number(value));
    case "percent":
      return `${Number(value).toFixed(1)}%`;
    case "date":
      return formatDate(String(value));
    case "month":
      return String(value);
    default:
      return String(value);
  }
}

const GROUPS = ["Platform", "Merchant", "Partner", "Operations"] as const;

/**
 * The report builder.
 *
 * Every report is generated from the live domain — the same booking ledger,
 * revenue ledger and settlement records the dashboards read — so a report can
 * never disagree with a screen. Each report brings its own columns, which is
 * what lets this one view render all ten and export any of them.
 */
export function ReportsView() {
  const scope = useDomainScope();
  const [report, setReport] = useState(REPORT_DEFS[0].id);
  const [range, setRange] = useState("12m");
  const [merchantId, setMerchantId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filters: ReportFilters = useMemo(
    () => ({
      range: from || to ? undefined : range,
      from: from || undefined,
      to: to || undefined,
      merchantId: merchantId || undefined,
    }),
    [range, from, to, merchantId],
  );

  const scopeKey = scope.merchantId ?? scope.organizationId ?? "all";
  const result = useQuery({
    queryKey: reportKeys.run(report, filters, scopeKey),
    queryFn: () => reportsService.run(report, filters, scope),
    staleTime: 10_000,
  });

  const data = result.data;
  const currency = data?.currency ?? "USD";

  // Report rows have no natural id, so a stable index key is attached on read.
  const rows: ReportRow[] = useMemo(
    () => (data?.rows ?? []).map((row, index) => ({ ...row, __rowId: String(index) })),
    [data],
  );

  const columns: ColumnDef<ReportRow>[] = useMemo(
    () =>
      (data?.columns ?? []).map((column) => ({
        id: column.key,
        header: column.header,
        align: column.align ?? (column.format === "text" ? "left" : undefined),
        cell: (row: ReportRow) => (
          <span
            className={
              column.align === "right" ? "tabular-nums text-body" : "text-body"
            }
          >
            {renderCell(row[column.key], column, currency)}
          </span>
        ),
      })),
    [data, currency],
  );

  const series: ChartSeries[] = useMemo(() => {
    const out: ChartSeries[] = [
      {
        key: "value",
        label: data?.trendLabels.primary ?? "Value",
        color: CHART_COLORS.primary,
        type: "area",
        format: (v) => formatCurrency(v, currency),
      },
    ];
    if (data?.trendLabels.secondary) {
      out.push({
        key: "secondary",
        label: data.trendLabels.secondary,
        color: CHART_COLORS.accent,
        type: "line",
        axis: "right",
      });
    }
    return out;
  }, [data, currency]);

  const handleExport = () => {
    if (!data) return;
    exportToCsv<ReportRow>(
      `${data.id}-${range}`,
      data.rows,
      data.columns.map((column) => ({
        header: column.header,
        value: (row: ReportRow) => {
          const raw = row[column.key];
          if (raw === null || raw === undefined) return "";
          // Numbers export unformatted so a spreadsheet can total them.
          return typeof raw === "number" ? raw : String(raw);
        },
      })),
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Select
            label="Report"
            value={report}
            onChange={(e) => setReport(e.target.value)}
            options={GROUPS.flatMap((group) =>
              REPORT_DEFS.filter((r) => r.group === group).map((r) => ({
                value: r.id,
                label: `${group} · ${r.name}`,
              })),
            )}
            wrapperClassName="lg:col-span-2"
          />
          <Select
            label="Range"
            value={range}
            onChange={(e) => setRange(e.target.value)}
            options={[...REPORT_RANGES]}
            disabled={Boolean(from || to)}
          />
          <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <Select
            label="Merchant"
            value={merchantId}
            onChange={(e) => setMerchantId(e.target.value)}
            options={[
              { value: "", label: "All merchants" },
              ...MERCHANTS.map((m) => ({ value: m.id, label: m.name })),
            ]}
            wrapperClassName="sm:w-64"
            disabled={Boolean(scope.merchantId)}
          />
          <Can anyPermission={["reports:export", "reports:read"]}>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="size-4" />}
              onClick={handleExport}
              disabled={(data?.rows.length ?? 0) === 0}
            >
              Export CSV
            </Button>
          </Can>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {result.isLoading
          ? Array.from({ length: 4 }, (_, i) => <StatCardSkeleton key={i} />)
          : (data?.stats ?? []).map((stat) => (
              <StatCard
                key={stat.label}
                label={stat.label}
                value={stat.value}
                icon={stat.icon}
                hint={stat.hint}
              />
            ))}
      </div>

      <ChartCard
        title={data?.name ?? "Report"}
        description={data?.description}
        loading={result.isLoading}
        empty={result.isSuccess && (data?.trend.length ?? 0) === 0}
        height={300}
      >
        <TrendChart
          data={data?.trend ?? []}
          xKey="period"
          series={series}
          height={300}
          dualAxis={Boolean(data?.trendLabels.secondary)}
          leftTickFormatter={(v) => `$${Math.round(v / 1000)}k`}
        />
      </ChartCard>

      <div className="rounded-card border border-line bg-surface shadow-card">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-semibold text-ink">{data?.name ?? "Breakdown"}</h2>
          {data?.note && <p className="mt-1 text-xs text-muted">{data.note}</p>}
        </div>
        <DataTable<ReportRow>
          columns={columns}
          rows={rows}
          getRowId={(row) => String(row.__rowId)}
          loading={result.isLoading}
          caption={data?.name}
          emptyState={
            <EmptyState
              title="Nothing in this period"
              description="Widen the date range or clear the merchant filter."
            />
          }
        />
      </div>

      {result.isError && (
        <Alert tone="danger" title="Report failed to generate">
          {result.error?.message ?? "Try a different range."}
        </Alert>
      )}
    </div>
  );
}
