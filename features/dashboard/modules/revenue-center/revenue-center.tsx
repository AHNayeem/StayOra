"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Plus, RotateCcw } from "lucide-react";
import {
  Alert,
  Button,
  CHART_COLORS,
  CategoryBarChart,
  ChartCard,
  DataTable,
  DonutChart,
  EmptyState,
  Input,
  Modal,
  Panel,
  PanelBody,
  PanelHeader,
  Select,
  StatCard,
  StatusBadge,
  Tabs,
  TrendChart,
  type ColumnDef,
} from "../../ui";
import { Can } from "../../rbac/permission-guard";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { exportToCsv } from "../../lib/export-csv";
import { formatCurrency, formatDate, formatNumber, formatPercent } from "../../lib/format";
import {
  REVENUE_SOURCES,
  REVENUE_STATUS_LABELS,
  SOURCE_LABELS,
  type RevenueEntry,
  type RevenueSource,
} from "../../domain/revenue";
import { PRODUCT_KIND_LABELS, SEGMENT_OPTIONS } from "../bookings/types";
import { useRoleView } from "../../domain/use-domain";
import { MERCHANTS } from "../../domain/seed";
import { useRevenueAdjustment, useRevenueCenter, useRevenueFilters } from "./hooks";

/** One colour per revenue source, stable across every chart on the page. */
const SOURCE_COLORS: Record<RevenueSource, string> = {
  booking_commission: CHART_COLORS.primary,
  b2b_margin: CHART_COLORS.accent,
  advertising: CHART_COLORS.violet,
  membership: CHART_COLORS.teal,
  insurance: CHART_COLORS.info,
  service_fee: CHART_COLORS.primary700,
  b2b_subscription: CHART_COLORS.accent600,
  merchant_subscription: CHART_COLORS.teal,
  cancellation_fee: CHART_COLORS.rose,
  promotional_subsidy: CHART_COLORS.rose,
  adjustment: CHART_COLORS.rose,
};

const STATUS_TONES = {
  accrued: "warning",
  finalized: "success",
  reversed: "danger",
  adjusted: "info",
} as const;

const ledgerColumns: ColumnDef<RevenueEntry>[] = [
  {
    id: "at",
    header: "Date",
    cell: (row) => formatDate(row.at),
    width: "w-32",
  },
  {
    id: "source",
    header: "Source",
    cell: (row) => (
      <span className="inline-flex items-center gap-2">
        <span
          aria-hidden="true"
          className="size-2 rounded-full"
          style={{ background: SOURCE_COLORS[row.source] }}
        />
        {SOURCE_LABELS[row.source]}
      </span>
    ),
  },
  {
    id: "label",
    header: "Description",
    cell: (row) => (
      <div className="min-w-0">
        <p className="truncate text-ink">{row.label}</p>
        <p className="truncate text-xs text-muted">
          {row.reference}
          {row.merchantName ? ` · ${row.merchantName}` : ""}
          {row.organizationName ? ` · ${row.organizationName}` : ""}
        </p>
      </div>
    ),
  },
  {
    id: "grossValue",
    header: "Transaction",
    align: "right",
    cell: (row) =>
      row.grossValue > 0 ? formatCurrency(row.grossValue, row.currency) : "—",
  },
  {
    id: "partnerShare",
    header: "Partner share",
    align: "right",
    cell: (row) =>
      row.partnerShare > 0 ? formatCurrency(row.partnerShare, row.currency) : "—",
  },
  {
    id: "net",
    header: "Platform revenue",
    align: "right",
    cell: (row) => (
      <span className={cn("font-semibold tabular-nums", row.net < 0 && "text-danger")}>
        {formatCurrency(row.net, row.currency)}
      </span>
    ),
  },
  {
    id: "status",
    header: "Status",
    cell: (row) => (
      <StatusBadge tone={STATUS_TONES[row.status]}>
        {REVENUE_STATUS_LABELS[row.status]}
      </StatusBadge>
    ),
    width: "w-28",
  },
];

/**
 * The Revenue Center — the answer to "how does Otithee make money?".
 *
 * Every figure comes from the revenue ledger, which derives booking commission,
 * service fees, the insurance margin and cancellation fees from the booking
 * records themselves and reads membership, advertising and B2B subscription
 * revenue from the stored entries those services wrote. Nothing on this page
 * recomputes a total, and nothing is counted twice: GBV, partner revenue and
 * platform revenue are three separate columns throughout.
 */
export function RevenueCenter() {
  const { isMerchant, isAgency } = useRoleView();
  const { filters, set, clear, activeCount } = useRevenueFilters();
  const center = useRevenueCenter(filters);
  const adjust = useRevenueAdjustment();
  const [tab, setTab] = useState("merchant");
  const [adjustOpen, setAdjustOpen] = useState(false);

  const data = center.data;
  const summary = data?.summary;
  const currency = summary?.currency ?? "USD";

  const mixSeries = useMemo(() => {
    const present = new Set(summary?.bySource.map((s) => s.source) ?? []);
    return REVENUE_SOURCES.filter((s) => present.has(s)).map((source) => ({
      key: source,
      label: SOURCE_LABELS[source],
      color: SOURCE_COLORS[source],
      type: "bar" as const,
      format: (v: number) => formatCurrency(v, currency),
    }));
  }, [summary, currency]);

  const mixRows = useMemo(
    () =>
      (data?.mixByMonth ?? []).map((row) => ({
        month: row.month,
        ...row.bySource,
      })),
    [data],
  );

  const groupTabs = [
    { key: "merchant", label: "By merchant", rows: data?.byMerchant ?? [] },
    { key: "product", label: "By vertical", rows: data?.byProduct ?? [] },
    { key: "destination", label: "By destination", rows: data?.byDestination ?? [] },
    { key: "account", label: "By B2B account", rows: data?.byAccount ?? [] },
    { key: "customer", label: "By customer", rows: data?.byCustomer ?? [] },
  ];
  const activeRows = groupTabs.find((t) => t.key === tab)?.rows ?? [];
  const chartRows = activeRows.slice(0, 10).map((r) => ({
    name:
      tab === "product"
        ? (PRODUCT_KIND_LABELS[r.key as keyof typeof PRODUCT_KIND_LABELS] ?? r.label)
        : r.label,
    value: r.net,
  }));

  const handleExport = () => {
    const rows = data?.recent ?? [];
    exportToCsv<RevenueEntry>("platform-revenue", rows, [
      { header: "Date", value: (r) => formatDate(r.at) },
      { header: "Reference", value: (r) => r.reference },
      { header: "Source", value: (r) => SOURCE_LABELS[r.source] },
      { header: "Description", value: (r) => r.label },
      { header: "Booking", value: (r) => r.bookingRef ?? "" },
      { header: "Merchant", value: (r) => r.merchantName ?? "" },
      { header: "B2B account", value: (r) => r.organizationName ?? "" },
      { header: "Customer", value: (r) => r.customerName ?? "" },
      { header: "Transaction value", value: (r) => r.grossValue.toFixed(2) },
      { header: "Partner share", value: (r) => r.partnerShare.toFixed(2) },
      { header: "Platform revenue", value: (r) => r.amount.toFixed(2) },
      { header: "Reversed", value: (r) => r.reversed.toFixed(2) },
      { header: "Net", value: (r) => r.net.toFixed(2) },
      { header: "Status", value: (r) => REVENUE_STATUS_LABELS[r.status] },
    ]);
    toast.success(`Exported ${rows.length} revenue entries`);
  };

  return (
    <div className="flex flex-col gap-5">
      {(isMerchant || isAgency) && (
        <Alert tone="info" title="Scoped to your own account">
          You&rsquo;re seeing platform revenue attributable to your own bookings. Platform-wide
          totals are visible to Otithee finance roles only.
        </Alert>
      )}

      {/* ---- headline: the three pots, kept apart ------------------------ */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Gross booking value"
          icon="Wallet"
          value={summary ? formatCurrency(summary.gmv, currency) : "—"}
          hint="What customers paid — not platform revenue"
        />
        <StatCard
          label="Merchant & partner revenue"
          icon="Store"
          value={summary ? formatCurrency(summary.partnerRevenue, currency) : "—"}
          hint="Owed to merchants, providers and agencies"
        />
        <StatCard
          label="Net platform revenue"
          icon="CircleDollarSign"
          value={summary ? formatCurrency(summary.netPlatformRevenue, currency) : "—"}
          hint={
            summary
              ? `${formatCurrency(summary.grossPlatformRevenue, currency)} gross − ${formatCurrency(summary.reversals + summary.subsidies, currency)} reversals`
              : undefined
          }
        />
        <StatCard
          label="Take rate"
          icon="Percent"
          value={summary ? `${summary.takeRate.toFixed(1)}%` : "—"}
          hint={
            summary
              ? `${formatCurrency(summary.nonBookingRevenue, currency)} from non-booking sources`
              : undefined
          }
        />
      </div>

      {/* ---- filters ------------------------------------------------------ */}
      <Panel flush>
        <PanelHeader
          title="Filter revenue"
          description="Every chart and table below reacts to these filters."
          actions={
            <div className="flex flex-wrap gap-2">
              {activeCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<RotateCcw className="size-4" />}
                  onClick={clear}
                >
                  Clear ({activeCount})
                </Button>
              )}
              <Can anyPermission={["finance:update"]}>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Plus className="size-4" />}
                  onClick={() => setAdjustOpen(true)}
                >
                  Adjustment
                </Button>
              </Can>
              <Can anyPermission={["finance:export", "finance:read"]}>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Download className="size-4" />}
                  onClick={handleExport}
                  disabled={!data?.recent.length}
                >
                  Export CSV
                </Button>
              </Can>
            </div>
          }
        />
        <PanelBody>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              type="date"
              label="From"
              value={filters.from?.slice(0, 10) ?? ""}
              onChange={(e) => set("from", e.target.value)}
            />
            <Input
              type="date"
              label="To"
              value={filters.to?.slice(0, 10) ?? ""}
              onChange={(e) => set("to", e.target.value)}
            />
            <Select
              label="Revenue source"
              value={filters.source ?? ""}
              onChange={(e) => set("source", e.target.value as RevenueSource)}
              options={[
                { value: "", label: "All sources" },
                ...REVENUE_SOURCES.map((s) => ({ value: s, label: SOURCE_LABELS[s] })),
              ]}
            />
            <Select
              label="Vertical"
              value={filters.productKind ?? ""}
              onChange={(e) =>
                set("productKind", e.target.value as (typeof filters)["productKind"])
              }
              options={[
                { value: "", label: "All verticals" },
                ...Object.entries(PRODUCT_KIND_LABELS).map(([value, label]) => ({
                  value,
                  label: String(label),
                })),
              ]}
            />
            <Select
              label="Merchant"
              value={filters.merchantId ?? ""}
              onChange={(e) => set("merchantId", e.target.value)}
              options={[
                { value: "", label: "All merchants" },
                ...MERCHANTS.map((m) => ({ value: m.id, label: m.name })),
              ]}
            />
            <Select
              label="Segment"
              value={filters.segment ?? ""}
              onChange={(e) => set("segment", e.target.value as (typeof filters)["segment"])}
              options={[{ value: "", label: "B2C + B2B" }, ...SEGMENT_OPTIONS]}
            />
            <Input
              label="Destination"
              placeholder="e.g. Dubai"
              value={filters.destination ?? ""}
              onChange={(e) => set("destination", e.target.value)}
            />
            <Input
              label="Search"
              placeholder="Reference, booking, customer…"
              value={filters.search ?? ""}
              onChange={(e) => set("search", e.target.value)}
            />
          </div>
        </PanelBody>
      </Panel>

      {/* ---- "how does Otithee make money?" ------------------------------ */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Panel flush className="lg:col-span-2">
          <PanelHeader
            title="How Otithee makes money"
            description="Every platform revenue source, net of reversals."
          />
          <PanelBody>
            {summary && summary.bySource.length > 0 ? (
              <dl className="space-y-2">
                {summary.bySource
                  .filter((row) => row.net >= 0)
                  .map((row) => (
                    <SourceLine
                      key={row.source}
                      label={row.label}
                      value={row.net}
                      currency={currency}
                      share={row.share}
                      count={row.count}
                      color={SOURCE_COLORS[row.source]}
                    />
                  ))}
                <div className="flex items-baseline justify-between gap-4 border-t-2 border-line pt-3">
                  <dt className="text-sm font-semibold text-ink">Gross platform revenue</dt>
                  <dd className="text-sm font-bold tabular-nums text-ink">
                    {formatCurrency(summary.grossPlatformRevenue, currency)}
                  </dd>
                </div>
                {summary.bySource
                  .filter((row) => row.net < 0)
                  .map((row) => (
                    <SourceLine
                      key={row.source}
                      label={row.label}
                      value={row.net}
                      currency={currency}
                      share={0}
                      count={row.count}
                      color={SOURCE_COLORS[row.source]}
                      negative
                    />
                  ))}
                {summary.reversals > 0 && (
                  <SourceLine
                    label="Refunds & commission reversals"
                    value={-summary.reversals}
                    currency={currency}
                    share={0}
                    count={0}
                    color={CHART_COLORS.rose}
                    negative
                  />
                )}
                {summary.subsidies > 0 && (
                  <SourceLine
                    label="Platform-funded promotions"
                    value={-summary.subsidies}
                    currency={currency}
                    share={0}
                    count={0}
                    color={CHART_COLORS.rose}
                    negative
                  />
                )}
                <div className="flex items-baseline justify-between gap-4 border-t-2 border-line pt-3">
                  <dt className="text-sm font-semibold text-ink">Net platform revenue</dt>
                  <dd className="text-base font-bold tabular-nums text-primary-700">
                    {formatCurrency(summary.netPlatformRevenue, currency)}
                  </dd>
                </div>
              </dl>
            ) : (
              <EmptyState
                title="No revenue in this period"
                description="Widen the date range or clear the filters."
              />
            )}
          </PanelBody>
        </Panel>

        <ChartCard
          className="lg:col-span-3"
          title="Revenue mix over time"
          description="Net platform revenue per source, by month"
          loading={center.isLoading}
          empty={center.isSuccess && mixRows.length === 0}
          height={300}
        >
          <TrendChart
            data={mixRows}
            xKey="month"
            series={mixSeries}
            height={300}
            leftTickFormatter={(v) => formatCurrency(v, currency).replace(/\.00$/, "")}
          />
        </ChartCard>
      </div>

      {/* ---- drill-downs -------------------------------------------------- */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Revenue drill-down"
          description="Net platform revenue, top 10"
          loading={center.isLoading}
          empty={center.isSuccess && chartRows.length === 0}
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
            label="Platform revenue"
            horizontal
            height={300}
            valueFormatter={(v) => formatCurrency(v, currency)}
          />
        </ChartCard>

        <ChartCard
          title="Source share"
          description="Where the money comes from"
          loading={center.isLoading}
          empty={center.isSuccess && !summary?.bySource.length}
        >
          <DonutChart
            data={(summary?.bySource ?? [])
              .filter((s) => s.net > 0)
              .map((s) => ({
                name: s.label,
                value: s.net,
                color: SOURCE_COLORS[s.source],
              }))}
            height={260}
            valueFormatter={(v) => formatCurrency(v, currency)}
            centerLabel="Net revenue"
            centerValue={
              summary ? formatCurrency(summary.netPlatformRevenue, currency) : undefined
            }
          />
        </ChartCard>
      </div>

      {/* ---- reconciliation against the booking ledger -------------------- */}
      <Panel flush>
        <PanelHeader
          title="Reconciliation with the booking ledger"
          description="The same numbers, computed the other way round — these two must agree."
        />
        <PanelBody>
          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            <Line label="GMV (booking totals)" value={data?.financials.gmv} currency={currency} />
            <Line label="Net sales" value={data?.financials.netSales} currency={currency} />
            <Line label="Taxes collected (not revenue)" value={data?.financials.taxes} currency={currency} muted />
            <Line label="Commission (net)" value={data?.financials.commission} currency={currency} />
            <Line label="Service fees" value={data?.financials.fees} currency={currency} />
            <Line label="Insurance margin" value={data?.financials.insuranceRevenue} currency={currency} />
            <Line label="Cancellation admin fees" value={data?.financials.cancellationFees} currency={currency} />
            <Line label="Platform-funded discounts" value={data?.financials.platformFundedDiscounts} currency={currency} negative />
            <Line label="Booking-side platform revenue" value={data?.financials.platformRevenue} currency={currency} strong />
            <Line label="Merchant earnings" value={data?.financials.merchantEarnings} currency={currency} muted />
            <Line label="Refunds paid" value={data?.financials.refunds} currency={currency} negative />
            <Line label="Pending settlements" value={data?.financials.pendingSettlements} currency={currency} muted />
          </dl>
          <p className="mt-4 text-xs text-muted">
            Tax is collected on behalf of the authority and is never platform revenue.
            Merchant earnings are the merchant&rsquo;s. Only the platform revenue line
            belongs to Otithee.
          </p>
        </PanelBody>
      </Panel>

      {/* ---- the ledger --------------------------------------------------- */}
      <Panel flush>
        <PanelHeader
          title="Revenue ledger"
          description={
            summary
              ? `${formatNumber(summary.entryCount)} entries — showing the 12 most recent`
              : undefined
          }
          actions={
            <Link
              href="/dashboard/reports"
              className="text-sm font-medium text-primary-700 hover:underline"
            >
              Full reports →
            </Link>
          }
        />
        <DataTable<RevenueEntry>
          columns={ledgerColumns}
          rows={data?.recent ?? []}
          getRowId={(row) => row.id}
          loading={center.isLoading}
          caption="Recent platform revenue entries"
          emptyState={
            <EmptyState
              title="No revenue entries"
              description="Nothing matched these filters."
            />
          }
        />
      </Panel>

      <Modal
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        title="Record a revenue adjustment"
        description="A manual credit or charge against platform revenue. Audited like any financial change."
      >
        <AdjustmentForm
          pending={adjust.status === "pending"}
          onSubmit={async (values) => {
            await adjust.mutateAsync(values);
            toast.success("Revenue adjustment recorded");
            setAdjustOpen(false);
          }}
        />
      </Modal>
    </div>
  );
}

function SourceLine({
  label,
  value,
  currency,
  share,
  count,
  color,
  negative,
}: {
  label: string;
  value: number;
  currency: string;
  share: number;
  count: number;
  color: string;
  negative?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="flex min-w-0 items-center gap-2 text-sm text-body">
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-full"
          style={{ background: color }}
        />
        <span className="truncate">{label}</span>
        {count > 0 && <span className="text-xs text-muted">({count})</span>}
      </dt>
      <dd className="flex shrink-0 items-baseline gap-3">
        {share > 0 && (
          <span className="text-xs tabular-nums text-muted">
            {formatPercent(share)}
          </span>
        )}
        <span
          className={cn(
            "text-sm font-semibold tabular-nums",
            negative ? "text-danger" : "text-ink",
          )}
        >
          {formatCurrency(value, currency)}
        </span>
      </dd>
    </div>
  );
}

function Line({
  label,
  value,
  currency,
  negative,
  muted,
  strong,
}: {
  label: string;
  value?: number;
  currency: string;
  negative?: boolean;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line pb-2">
      <dt className={cn("text-sm", muted ? "text-muted" : "text-body")}>{label}</dt>
      <dd
        className={cn(
          "text-sm tabular-nums",
          negative ? "font-semibold text-danger" : strong ? "font-bold text-primary-700" : "font-semibold text-ink",
          muted && !negative && !strong && "font-medium text-muted",
        )}
      >
        {value === undefined
          ? "—"
          : `${negative && value > 0 ? "−" : ""}${formatCurrency(value, currency)}`}
      </dd>
    </div>
  );
}

function AdjustmentForm({
  pending,
  onSubmit,
}: {
  pending: boolean;
  onSubmit: (values: {
    amount: number;
    label: string;
    note?: string;
    merchantId?: string;
  }) => void | Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [merchantId, setMerchantId] = useState("");
  const [note, setNote] = useState("");
  const parsed = Number(amount);
  const valid = label.trim().length > 2 && Number.isFinite(parsed) && parsed !== 0;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        void onSubmit({
          amount: parsed,
          label: label.trim(),
          note: note.trim() || undefined,
          merchantId: merchantId || undefined,
        });
      }}
    >
      <Input
        label="Description"
        required
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="e.g. Goodwill credit — delayed settlement"
      />
      <Input
        label="Amount (USD)"
        required
        type="number"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        hint="Negative reduces platform revenue, positive increases it."
      />
      <Select
        label="Merchant (optional)"
        value={merchantId}
        onChange={(e) => setMerchantId(e.target.value)}
        options={[
          { value: "", label: "Not merchant-specific" },
          ...MERCHANTS.map((m) => ({ value: m.id, label: m.name })),
        ]}
      />
      <Input
        label="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Why this adjustment was approved"
      />
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={!valid || pending} loading={pending}>
          Record adjustment
        </Button>
      </div>
    </form>
  );
}
