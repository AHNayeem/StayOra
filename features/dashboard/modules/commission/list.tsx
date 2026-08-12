"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { ResourceListView } from "../../crud";
import {
  Alert,
  Button,
  CHART_COLORS,
  CategoryBarChart,
  ChartCard,
  DonutChart,
  Panel,
  PanelBody,
  PanelHeader,
  Select,
  StatCard,
  Tabs,
} from "../../ui";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { formatCurrency, formatDate, formatNumber } from "../../lib/format";
import { labelMap, statusOptions } from "../../lib/status";
import { exportToCsv } from "../../lib/export-csv";
import { toast } from "@/lib/toast";
import type { CommissionEntry, CommissionStatus } from "../../domain/types";
import { useRoleView } from "../../domain/use-domain";
import { PRODUCT_KIND_LABELS, SEGMENT_OPTIONS } from "../bookings/types";
import {
  useCommissionBreakdown,
  useCommissions,
  usePlatformFinancials,
} from "./hooks";
import { COMMISSION_STATUSES } from "./types";

const statusLabel = labelMap(COMMISSION_STATUSES);

/**
 * Commission dashboard.
 *
 * Everything here is derived by the commission engine from the booking ledger —
 * GMV, discounts, taxes, platform fees, commission (net of reversals), merchant
 * earnings and settlement position — then broken down by merchant, product,
 * segment and month. No component computes a rate or a total itself.
 */
export function CommissionList() {
  const { isMerchant } = useRoleView();
  const financials = usePlatformFinancials();
  const breakdown = useCommissionBreakdown();
  const list = useCommissions();
  const [tab, setTab] = useState("merchant");

  const { status = "", segment = "" } = list.filters;
  const activeFilters: ActiveFilter[] = [
    status && { key: "status", label: `Status: ${statusLabel[status as CommissionStatus]}` },
    segment && { key: "segment", label: `Segment: ${segment.toUpperCase()}` },
  ].filter(Boolean) as ActiveFilter[];

  const handleExport = () => {
    exportToCsv<CommissionEntry>("commission", list.rows, [
      { header: "Reference", value: (r) => r.reference },
      { header: "Booking", value: (r) => r.bookingRef },
      { header: "Merchant", value: (r) => r.merchantName },
      { header: "Product", value: (r) => PRODUCT_KIND_LABELS[r.productKind] },
      { header: "Segment", value: (r) => r.segment.toUpperCase() },
      { header: "Net sale", value: (r) => formatCurrency(r.netSale, r.currency) },
      { header: "Rate", value: (r) => `${r.rate}%` },
      { header: "Commission", value: (r) => formatCurrency(r.commission, r.currency) },
      { header: "Reversed", value: (r) => formatCurrency(r.reversed, r.currency) },
      { header: "Merchant earning", value: (r) => formatCurrency(r.merchantEarning, r.currency) },
      { header: "Status", value: (r) => statusLabel[r.status] },
      { header: "Date", value: (r) => formatDate(r.createdAt) },
    ]);
    toast.success(`Exported ${list.rows.length} commission entries`);
  };

  const f = financials.data;
  const b = breakdown.data;
  const currency = f?.currency ?? "USD";

  const groupTabs = [
    { key: "merchant", label: "By merchant", rows: b?.byMerchant ?? [] },
    { key: "product", label: "By product", rows: b?.byProduct ?? [] },
    { key: "month", label: "By month", rows: b?.byMonth ?? [] },
  ];
  const activeRows = groupTabs.find((t) => t.key === tab)?.rows ?? [];
  const chartRows = activeRows.slice(0, 10).map((r) => ({
    name:
      tab === "product"
        ? (PRODUCT_KIND_LABELS[r.key as keyof typeof PRODUCT_KIND_LABELS] ?? r.label)
        : r.label,
    value: r.value,
  }));

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="GMV"
          icon="Wallet"
          value={f ? formatCurrency(f.gmv, currency) : "—"}
          hint={f ? `${formatNumber(f.bookingCount)} bookings` : undefined}
        />
        <StatCard
          label={isMerchant ? "Commission paid" : "Commission earned"}
          icon="Percent"
          value={f ? formatCurrency(f.commission, currency) : "—"}
          hint={f ? `Take rate ${f.takeRate}% · ${formatCurrency(f.commissionReversed, currency)} reversed` : undefined}
        />
        <StatCard
          label={isMerchant ? "Net earnings" : "Merchant earnings"}
          icon="Store"
          value={f ? formatCurrency(f.merchantEarnings, currency) : "—"}
          hint={f ? `${formatCurrency(f.refunds, currency)} refunded` : undefined}
        />
        <StatCard
          label="Platform revenue"
          icon="CircleDollarSign"
          value={f ? formatCurrency(f.platformRevenue, currency) : "—"}
          hint="Commission + platform fees"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Commission breakdown"
          description="Net of reversals, from the booking ledger"
          loading={breakdown.isLoading}
          empty={breakdown.isSuccess && chartRows.length === 0}
          actions={
            <Tabs
              items={groupTabs.map((t) => ({ key: t.key, label: t.label }))}
              value={tab}
              onValueChange={setTab}
              variant="pill"
              renderPanels={false}
            />
          }
        >
          <CategoryBarChart
            data={chartRows}
            xKey="name"
            valueKey="value"
            label="Commission"
            horizontal={tab !== "month"}
            height={280}
            valueFormatter={(v) => formatCurrency(v, currency)}
          />
        </ChartCard>

        <ChartCard
          title="B2C vs B2B"
          description="Where commission comes from"
          loading={breakdown.isLoading}
          empty={breakdown.isSuccess && (b?.bySegment.length ?? 0) === 0}
        >
          <DonutChart
            data={(b?.bySegment ?? []).map((s, i) => ({
              name: s.key.toUpperCase(),
              value: s.value,
              color: i === 0 ? CHART_COLORS.primary : CHART_COLORS.accent,
            }))}
            height={240}
            valueFormatter={(v) => formatCurrency(v, currency)}
            centerLabel="Commission"
            centerValue={f ? formatCurrency(f.commission, currency) : undefined}
          />
        </ChartCard>
      </div>

      <Panel flush>
        <PanelHeader
          title="Financial reconciliation"
          description="Every line is derived from one formula in the commission engine."
        />
        <PanelBody>
          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            <Line label="Net sales" value={f?.netSales} currency={currency} />
            <Line label="Discounts given" value={f?.discounts} currency={currency} negative />
            <Line label="Taxes collected" value={f?.taxes} currency={currency} />
            <Line label="Platform fees" value={f?.fees} currency={currency} />
            <Line label="Commission (net)" value={f?.commission} currency={currency} />
            <Line label="Commission reversed" value={f?.commissionReversed} currency={currency} negative />
            <Line label="Refunds paid" value={f?.refunds} currency={currency} negative />
            <Line label="Pending settlements" value={f?.pendingSettlements} currency={currency} />
            <Line label="Completed settlements" value={f?.completedSettlements} currency={currency} />
          </dl>
          {f && f.failedCount > 0 && (
            <Alert tone="warning" title="Failed bookings excluded from earnings" className="mt-4">
              {f.failedCount} booking{f.failedCount === 1 ? "" : "s"} failed and{" "}
              {f.refundedCount} were refunded. Their commission is reversed, so it never
              reaches a settlement.
            </Alert>
          )}
        </PanelBody>
      </Panel>

      <ResourceListView<CommissionEntry>
        list={list}
        searchPlaceholder="Search entry, booking or merchant…"
        activeFilters={activeFilters}
        selectable={false}
        filterControls={
          <>
            <Select
              aria-label="Filter by status"
              value={status}
              onChange={(e) => list.setFilter("status", e.target.value)}
              options={[
                { value: "", label: "All statuses" },
                ...statusOptions(COMMISSION_STATUSES),
              ]}
              wrapperClassName="w-44"
            />
            <Select
              aria-label="Filter by segment"
              value={segment}
              onChange={(e) => list.setFilter("segment", e.target.value)}
              options={[{ value: "", label: "B2C + B2B" }, ...SEGMENT_OPTIONS]}
              wrapperClassName="w-44"
            />
          </>
        }
        primaryAction={
          <Can anyPermission={["finance:export", "finance:read"]}>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="size-4" />}
              onClick={handleExport}
              disabled={list.rows.length === 0}
            >
              Export CSV
            </Button>
          </Can>
        }
        caption="Commission ledger"
      />
    </div>
  );
}

function Line({
  label,
  value,
  currency,
  negative,
}: {
  label: string;
  value?: number;
  currency: string;
  negative?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line pb-2">
      <dt className="text-sm text-body">{label}</dt>
      <dd
        className={
          negative
            ? "text-sm font-semibold tabular-nums text-danger"
            : "text-sm font-semibold tabular-nums text-ink"
        }
      >
        {value === undefined
          ? "—"
          : `${negative && value > 0 ? "−" : ""}${formatCurrency(value, currency)}`}
      </dd>
    </div>
  );
}
