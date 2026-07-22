"use client";

import { Download } from "lucide-react";
import { ResourceListView } from "../../crud";
import { Button, Select } from "../../ui";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { formatCurrency, formatDate } from "../../lib/format";
import { labelMap, statusOptions } from "../../lib/status";
import { exportToCsv } from "../../lib/export-csv";
import { usePayments } from "./hooks";
import { PAYMENT_STATUSES, type Payment } from "./types";

const statusLabel = labelMap(PAYMENT_STATUSES);

/** Payments list — status facet + CSV export of the loaded page. */
export function PaymentsList() {
  const list = usePayments();
  const status = list.filters.status ?? "";
  const activeFilters: ActiveFilter[] = status
    ? [{ key: "status", label: `Status: ${statusLabel[status as Payment["status"]]}` }]
    : [];

  const handleExport = () => {
    exportToCsv<Payment>("payments", list.rows, [
      { header: "Reference", value: (r) => r.reference },
      { header: "Merchant", value: (r) => r.merchant },
      { header: "Booking", value: (r) => r.bookingRef },
      { header: "Method", value: (r) => r.method },
      { header: "Amount", value: (r) => formatCurrency(r.amount, r.currency) },
      { header: "Status", value: (r) => statusLabel[r.status] },
      { header: "Date", value: (r) => formatDate(r.createdAt) },
    ]);
  };

  return (
    <ResourceListView<Payment>
      list={list}
      searchPlaceholder="Search reference, merchant or booking…"
      activeFilters={activeFilters}
      selectable={false}
      filterControls={
        <Select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => list.setFilter("status", e.target.value)}
          options={[
            { value: "", label: "All statuses" },
            ...statusOptions(PAYMENT_STATUSES),
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
      caption="Payments"
    />
  );
}
