"use client";

import { Download } from "lucide-react";
import { ResourceListView } from "../../crud";
import { Button, Select } from "../../ui";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { formatCurrency, formatDate } from "../../lib/format";
import { labelMap, statusOptions } from "../../lib/status";
import { exportToCsv } from "../../lib/export-csv";
import { useRefunds } from "./hooks";
import { REFUND_STATUSES, type Refund } from "./types";

const statusLabel = labelMap(REFUND_STATUSES);

/** Refunds list — status facet + CSV export of the loaded page. */
export function RefundsList() {
  const list = useRefunds();
  const status = list.filters.status ?? "";
  const activeFilters: ActiveFilter[] = status
    ? [{ key: "status", label: `Status: ${statusLabel[status as Refund["status"]]}` }]
    : [];

  const handleExport = () => {
    exportToCsv<Refund>("refunds", list.rows, [
      { header: "Reference", value: (r) => r.reference },
      { header: "Booking", value: (r) => r.bookingRef },
      { header: "Customer", value: (r) => r.customer },
      { header: "Reason", value: (r) => r.reason },
      { header: "Amount", value: (r) => formatCurrency(r.amount, r.currency) },
      { header: "Status", value: (r) => statusLabel[r.status] },
      { header: "Date", value: (r) => formatDate(r.createdAt) },
    ]);
  };

  return (
    <ResourceListView<Refund>
      list={list}
      searchPlaceholder="Search reference, booking or customer…"
      activeFilters={activeFilters}
      selectable={false}
      filterControls={
        <Select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => list.setFilter("status", e.target.value)}
          options={[
            { value: "", label: "All statuses" },
            ...statusOptions(REFUND_STATUSES),
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
      caption="Refunds"
    />
  );
}
