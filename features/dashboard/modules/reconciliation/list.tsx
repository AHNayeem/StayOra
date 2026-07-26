"use client";

import { Download, FileSearch } from "lucide-react";
import { toast } from "@/lib/toast";
import { ResourceListView, RowActions } from "../../crud";
import { Button, Select, StatCard, StatCardSkeleton } from "../../ui";
import { DropdownItem } from "../../ui/dropdown-menu";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { formatCurrency, formatDate, formatPercent } from "../../lib/format";
import { labelMap, statusOptions } from "../../lib/status";
import { exportToCsv } from "../../lib/export-csv";
import { useReconciliations, useReconciliationSummary } from "./hooks";
import { RECONCILIATION_STATUSES, type ReconciliationBatch } from "./types";

const statusLabel = labelMap(RECONCILIATION_STATUSES);

/** Reconciliation batches — variance KPIs, status facet, per-batch investigate. */
export function ReconciliationList() {
  const summary = useReconciliationSummary();

  const investigate = (row: ReconciliationBatch) =>
    toast.info("Investigation opened", {
      description: `${row.unmatched} unmatched item(s) in ${row.reference} flagged for review (demo).`,
    });

  const list = useReconciliations((row) => (
    <RowActions
      label={`Actions for ${row.reference}`}
      extra={
        <Can anyPermission={["finance:update"]}>
          <DropdownItem
            icon={<FileSearch />}
            disabled={row.unmatched === 0}
            onSelect={() => investigate(row)}
          >
            Investigate
          </DropdownItem>
        </Can>
      }
    />
  ));

  const status = list.filters.status ?? "";
  const activeFilters: ActiveFilter[] = status
    ? [{ key: "status", label: `Status: ${statusLabel[status as ReconciliationBatch["status"]]}` }]
    : [];

  const handleExport = () => {
    exportToCsv<ReconciliationBatch>("reconciliation", list.rows, [
      { header: "Batch", value: (r) => r.reference },
      { header: "Gateway", value: (r) => r.gateway },
      { header: "Period", value: (r) => r.period },
      { header: "Expected", value: (r) => formatCurrency(r.expected, r.currency) },
      { header: "Settled", value: (r) => formatCurrency(r.settled, r.currency) },
      { header: "Variance", value: (r) => formatCurrency(r.variance, r.currency) },
      { header: "Unmatched", value: (r) => String(r.unmatched) },
      { header: "Status", value: (r) => statusLabel[r.status] },
      { header: "Run", value: (r) => formatDate(r.runAt) },
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
            <StatCard label="Batches" value={String(s.batches)} icon="Scale" />
            <StatCard
              label="Balanced rate"
              value={formatPercent(s.balancedRate)}
              icon="CircleCheck"
            />
            <StatCard
              label="Unmatched items"
              value={String(s.unmatchedItems)}
              icon="TriangleAlert"
              hint="Awaiting investigation"
            />
            <StatCard
              label="Net variance"
              value={formatCurrency(s.totalVariance, s.currency)}
              icon="CircleDollarSign"
            />
          </>
        )}
      </div>

      <ResourceListView<ReconciliationBatch>
        list={list}
        searchPlaceholder="Search batch, gateway or period…"
        activeFilters={activeFilters}
        selectable={false}
        filterControls={
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => list.setFilter("status", e.target.value)}
            options={[
              { value: "", label: "All statuses" },
              ...statusOptions(RECONCILIATION_STATUSES),
            ]}
            wrapperClassName="w-44"
          />
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
        caption="Reconciliation"
      />
    </div>
  );
}
