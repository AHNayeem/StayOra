"use client";

import { Download } from "lucide-react";
import { ResourceListView } from "../../crud";
import { Button, Select, StatCard, StatCardSkeleton } from "../../ui";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { formatCurrency, formatDateTime } from "../../lib/format";
import { labelMap, statusOptions } from "../../lib/status";
import { exportToCsv } from "../../lib/export-csv";
import { useTransactions, useTransactionSummary } from "./hooks";
import {
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES,
  type Transaction,
} from "./types";

const typeLabel = labelMap(TRANSACTION_TYPES);
const statusLabel = labelMap(TRANSACTION_STATUSES);

/** Wallet transactions ledger — inflow/outflow KPIs, type + status facets, CSV. */
export function TransactionsList() {
  const list = useTransactions();
  const summary = useTransactionSummary();

  const type = list.filters.type ?? "";
  const status = list.filters.status ?? "";

  const activeFilters: ActiveFilter[] = [
    type
      ? { key: "type", label: `Type: ${typeLabel[type as Transaction["type"]]}` }
      : null,
    status
      ? { key: "status", label: `Status: ${statusLabel[status as Transaction["status"]]}` }
      : null,
  ].filter(Boolean) as ActiveFilter[];

  const handleExport = () => {
    exportToCsv<Transaction>("transactions", list.rows, [
      { header: "Reference", value: (r) => r.reference },
      { header: "Type", value: (r) => typeLabel[r.type] },
      { header: "Direction", value: (r) => r.direction },
      { header: "Merchant", value: (r) => r.merchant },
      { header: "Description", value: (r) => r.description },
      { header: "Amount", value: (r) => formatCurrency(r.amount, r.currency) },
      { header: "Balance", value: (r) => formatCurrency(r.balanceAfter, r.currency) },
      { header: "Status", value: (r) => statusLabel[r.status] },
      { header: "Date", value: (r) => formatDateTime(r.createdAt) },
    ]);
  };

  const s = summary.data;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.isLoading || !s ? (
          Array.from({ length: 4 }, (_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Total inflow"
              value={formatCurrency(s.inflow, s.currency)}
              icon="ArrowLeftRight"
              hint="Captures, commission & top-ups"
            />
            <StatCard
              label="Total outflow"
              value={formatCurrency(s.outflow, s.currency)}
              icon="CircleDollarSign"
              hint="Payouts, refunds & adjustments"
            />
            <StatCard
              label="Net movement"
              value={formatCurrency(s.net, s.currency)}
              icon="Coins"
            />
            <StatCard
              label="Transactions"
              value={String(s.count)}
              icon="Landmark"
            />
          </>
        )}
      </div>

      <ResourceListView<Transaction>
        list={list}
        searchPlaceholder="Search reference, merchant or note…"
        activeFilters={activeFilters}
        selectable={false}
        filterControls={
          <>
            <Select
              aria-label="Filter by type"
              value={type}
              onChange={(e) => list.setFilter("type", e.target.value)}
              options={[
                { value: "", label: "All types" },
                ...statusOptions(TRANSACTION_TYPES),
              ]}
              wrapperClassName="w-40"
            />
            <Select
              aria-label="Filter by status"
              value={status}
              onChange={(e) => list.setFilter("status", e.target.value)}
              options={[
                { value: "", label: "All statuses" },
                ...statusOptions(TRANSACTION_STATUSES),
              ]}
              wrapperClassName="w-40"
            />
          </>
        }
        primaryAction={
          <Can permissions={["finance:export"]}>
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
        caption="Transactions"
      />
    </div>
  );
}
