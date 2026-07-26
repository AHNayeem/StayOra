"use client";

import { Download } from "lucide-react";
import { ResourceListView } from "../../crud";
import { Button, Select } from "../../ui";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { formatCurrency, formatDate } from "../../lib/format";
import { labelMap, statusOptions } from "../../lib/status";
import { exportToCsv } from "../../lib/export-csv";
import { useInvoices } from "./hooks";
import { INVOICE_STATUSES, type Invoice } from "./types";

const statusLabel = labelMap(INVOICE_STATUSES);

/** Invoices list — status facet + CSV export of the loaded page. */
export function InvoicesList() {
  const list = useInvoices();
  const status = list.filters.status ?? "";
  const activeFilters: ActiveFilter[] = status
    ? [{ key: "status", label: `Status: ${statusLabel[status as Invoice["status"]]}` }]
    : [];

  const handleExport = () => {
    exportToCsv<Invoice>("invoices", list.rows, [
      { header: "Number", value: (r) => r.number },
      { header: "Merchant", value: (r) => r.merchant },
      { header: "Amount", value: (r) => formatCurrency(r.amount, r.currency) },
      { header: "Issued", value: (r) => formatDate(r.issuedAt) },
      { header: "Due", value: (r) => formatDate(r.dueAt) },
      { header: "Status", value: (r) => statusLabel[r.status] },
    ]);
  };

  return (
    <ResourceListView<Invoice>
      list={list}
      searchPlaceholder="Search number or merchant…"
      activeFilters={activeFilters}
      selectable={false}
      filterControls={
        <Select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => list.setFilter("status", e.target.value)}
          options={[
            { value: "", label: "All statuses" },
            ...statusOptions(INVOICE_STATUSES),
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
      caption="Invoices"
    />
  );
}
