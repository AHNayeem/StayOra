"use client";

import { Download } from "lucide-react";
import { ResourceListView } from "../../crud";
import { Button, Select } from "../../ui";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { formatCurrency, formatDate } from "../../lib/format";
import { labelMap, statusOptions } from "../../lib/status";
import { exportToCsv } from "../../lib/export-csv";
import { usePayouts } from "./hooks";
import { PAYOUT_STATUSES, type Payout } from "./types";

const statusLabel = labelMap(PAYOUT_STATUSES);

/** Payouts list — status facet + CSV export of the loaded page. */
export function PayoutsList() {
  const list = usePayouts();
  const status = list.filters.status ?? "";
  const activeFilters: ActiveFilter[] = status
    ? [{ key: "status", label: `Status: ${statusLabel[status as Payout["status"]]}` }]
    : [];

  const handleExport = () => {
    exportToCsv<Payout>("payouts", list.rows, [
      { header: "Reference", value: (r) => r.reference },
      { header: "Merchant", value: (r) => r.merchant },
      { header: "Method", value: (r) => r.method },
      { header: "Amount", value: (r) => formatCurrency(r.amount, r.currency) },
      { header: "Status", value: (r) => statusLabel[r.status] },
      { header: "Date", value: (r) => formatDate(r.createdAt) },
    ]);
  };

  return (
    <ResourceListView<Payout>
      list={list}
      searchPlaceholder="Search reference or merchant…"
      activeFilters={activeFilters}
      selectable={false}
      filterControls={
        <Select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => list.setFilter("status", e.target.value)}
          options={[
            { value: "", label: "All statuses" },
            ...statusOptions(PAYOUT_STATUSES),
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
      caption="Payouts"
    />
  );
}
