"use client";

import { useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { ResourceListView, RowActions } from "../../crud";
import {
  Alert,
  Button,
  DropdownItem,
  Drawer,
  Select,
  StatCard,
  StatusBadge,
} from "../../ui";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { formatCurrency, formatDate } from "../../lib/format";
import { labelMap, statusOptions, toneMap } from "../../lib/status";
import { exportToCsv } from "../../lib/export-csv";
import { getErrorMessage } from "../../data";
import { toast } from "@/lib/toast";
import { SETTLEMENT_STATUSES, SETTLEMENT_TRANSITIONS } from "../../domain/lifecycle";
import type { Settlement, SettlementStatus } from "../../domain/types";
import { useRbac } from "../../rbac/rbac-provider";
import { useRoleView } from "../../domain/use-domain";
import { usePlatformFinancials } from "../commission/hooks";
import { useSettlementAdvance, useSettlementBookings, useSettlements } from "./hooks";

const statusLabel = labelMap(SETTLEMENT_STATUSES);
const statusTone = toneMap(SETTLEMENT_STATUSES);

const ACTION_LABELS: Partial<Record<SettlementStatus, string>> = {
  scheduled: "Schedule payout",
  processing: "Send to bank",
  paid: "Mark paid",
  on_hold: "Put on hold",
  pending: "Return to pending",
  failed: "Mark failed",
};

/**
 * Settlements — the payout console.
 *
 * Finance drives batches from pending → scheduled → processing → paid (or holds
 * them), and marking one paid settles its commission entries. Merchants see the
 * same batches read-only, which is how they can reconcile a payout line by line
 * against their own bookings.
 */
export function SettlementsList() {
  const { can } = useRbac();
  const { isMerchant } = useRoleView();
  const advance = useSettlementAdvance();
  const financials = usePlatformFinancials();
  const [selected, setSelected] = useState<Settlement | null>(null);
  const bookings = useSettlementBookings(selected?.id ?? "", Boolean(selected));
  const canManage = can("finance:update");

  const run = async (settlement: Settlement, to: SettlementStatus) => {
    try {
      await advance.mutateAsync({ id: settlement.id, to });
      toast.success(`${settlement.reference} → ${statusLabel[to]}`, {
        description:
          to === "paid"
            ? `${formatCurrency(settlement.netPayable, settlement.currency)} released to ${settlement.merchantName}.`
            : undefined,
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const list = useSettlements((row) => (
    <RowActions
      label={`Actions for ${row.reference}`}
      onView={() => setSelected(row)}
      viewPermission={["finance:read"]}
      extra={
        canManage
          ? SETTLEMENT_TRANSITIONS[row.status].map((to) => (
              <DropdownItem
                key={to}
                danger={to === "on_hold" || to === "failed"}
                disabled={advance.isPending}
                onSelect={() => void run(row, to)}
              >
                {ACTION_LABELS[to] ?? statusLabel[to]}
              </DropdownItem>
            ))
          : null
      }
    />
  ));

  const { status = "" } = list.filters;
  const activeFilters: ActiveFilter[] = status
    ? [{ key: "status", label: `Status: ${statusLabel[status as SettlementStatus]}` }]
    : [];

  const handleExport = () => {
    exportToCsv<Settlement>("settlements", list.rows, [
      { header: "Reference", value: (r) => r.reference },
      { header: "Merchant", value: (r) => r.merchantName },
      { header: "Period start", value: (r) => formatDate(r.periodStart) },
      { header: "Period end", value: (r) => formatDate(r.periodEnd) },
      { header: "Bookings", value: (r) => r.bookingCount },
      { header: "Gross sales", value: (r) => formatCurrency(r.grossSales, r.currency) },
      { header: "Discounts", value: (r) => formatCurrency(r.discounts, r.currency) },
      { header: "Commission", value: (r) => formatCurrency(r.commission, r.currency) },
      { header: "Refund adjustment", value: (r) => formatCurrency(r.refundAdjustment, r.currency) },
      { header: "Net payable", value: (r) => formatCurrency(r.netPayable, r.currency) },
      { header: "Status", value: (r) => statusLabel[r.status] },
      { header: "Method", value: (r) => r.method },
      { header: "Payout date", value: (r) => formatDate(r.paidAt ?? r.scheduledFor) },
    ]);
    toast.success(`Exported ${list.rows.length} settlements`);
  };

  const f = financials.data;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pending settlement"
          icon="Clock"
          value={f ? formatCurrency(f.pendingSettlements, f.currency) : "—"}
          hint="Not yet paid out"
        />
        <StatCard
          label="Paid to date"
          icon="Wallet"
          value={f ? formatCurrency(f.completedSettlements, f.currency) : "—"}
        />
        <StatCard
          label={isMerchant ? "Commission paid" : "Commission retained"}
          icon="Percent"
          value={f ? formatCurrency(f.commission, f.currency) : "—"}
        />
        <StatCard
          label="Refund adjustments"
          icon="BanknoteArrowDown"
          value={f ? formatCurrency(f.refunds, f.currency) : "—"}
          hint="Deducted from merchant earnings"
        />
      </div>

      <ResourceListView<Settlement>
        list={list}
        searchPlaceholder="Search batch, merchant or method…"
        activeFilters={activeFilters}
        selectable={false}
        filterControls={
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => list.setFilter("status", e.target.value)}
            options={[
              { value: "", label: "All statuses" },
              ...statusOptions(SETTLEMENT_STATUSES),
            ]}
            wrapperClassName="w-44"
          />
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
        onRowClick={(row) => setSelected(row)}
        caption="Settlement batches"
      />

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        size="lg"
        title={selected ? `Settlement ${selected.reference}` : "Settlement"}
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <StatusBadge tone={statusTone[selected.status]}>
                {statusLabel[selected.status]}
              </StatusBadge>
              <span className="text-sm text-muted">
                {formatDate(selected.periodStart)} – {formatDate(selected.periodEnd)} ·{" "}
                {selected.method}
              </span>
            </div>

            <dl className="divide-y divide-line rounded-card border border-line p-4">
              <Row label="Gross sales" value={selected.grossSales} currency={selected.currency} />
              <Row label="Discounts" value={-selected.discounts} currency={selected.currency} />
              <Row label="Platform commission" value={-selected.commission} currency={selected.currency} />
              <Row label="Refund adjustment" value={-selected.refundAdjustment} currency={selected.currency} />
              <Row label="Net payable" value={selected.netPayable} currency={selected.currency} strong />
            </dl>

            {selected.status === "on_hold" && (
              <Alert tone="warning" title="On hold">
                Refunds in this period exceeded half of the payable amount, so the batch
                was held for review before release.
              </Alert>
            )}

            {canManage && SETTLEMENT_TRANSITIONS[selected.status].length > 0 && (
              <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                {SETTLEMENT_TRANSITIONS[selected.status].map((to) => (
                  <Button
                    key={to}
                    size="sm"
                    variant={to === "on_hold" || to === "failed" ? "danger" : "primary"}
                    loading={advance.isPending}
                    onClick={() => void run(selected, to)}
                  >
                    {ACTION_LABELS[to] ?? statusLabel[to]}
                  </Button>
                ))}
              </div>
            )}

            <div>
              <p className="text-sm font-semibold text-ink">
                Bookings in this batch ({selected.bookingCount})
              </p>
              {bookings.isLoading ? (
                <p className="mt-2 text-sm text-muted">Loading bookings…</p>
              ) : (
                <ul className="mt-2 divide-y divide-line">
                  {bookings.data?.map((b) => (
                    <li key={b.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/bookings/${b.id}`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {b.reference}
                        </Link>
                        <p className="truncate text-xs text-muted">
                          {b.productTitle} · {b.customer.name}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-medium tabular-nums text-ink">
                          {formatCurrency(b.money.netSettlement, b.money.currency)}
                        </p>
                        <p className="text-xs text-muted">
                          −{formatCurrency(b.money.commission, b.money.currency)} commission
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function Row({
  label,
  value,
  currency,
  strong,
}: {
  label: string;
  value: number;
  currency: string;
  strong?: boolean;
}) {
  const negative = value < 0;
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className={strong ? "text-sm font-semibold text-ink" : "text-sm text-body"}>
        {label}
      </dt>
      <dd
        className={
          negative
            ? "text-sm font-medium tabular-nums text-danger"
            : strong
              ? "text-base font-bold tabular-nums text-ink"
              : "text-sm font-medium tabular-nums text-ink"
        }
      >
        {negative ? "−" : ""}
        {formatCurrency(Math.abs(value), currency)}
      </dd>
    </div>
  );
}
