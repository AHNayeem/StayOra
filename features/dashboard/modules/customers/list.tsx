"use client";

import { useState } from "react";
import { Download, Plus } from "lucide-react";
import { ConfirmDialog, ResourceListView, RowActions } from "../../crud";
import { Button, Drawer, Select } from "../../ui";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { formatCurrency, formatDate, formatNumber } from "../../lib/format";
import { labelMap, statusOptions } from "../../lib/status";
import { exportToCsv } from "../../lib/export-csv";
import { useCustomers, useDeleteCustomer } from "./hooks";
import { CustomerForm } from "./form";
import { CUSTOMER_STATUSES, type Customer } from "./types";

const statusLabel = labelMap(CUSTOMER_STATUSES);

/** Customers directory — create, per-row edit and delete, filter and export. */
export function CustomersList() {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const del = useDeleteCustomer();

  const list = useCustomers((row) => (
    <RowActions
      label={`Actions for ${row.name}`}
      onEdit={() => setEditing(row)}
      onDelete={() => setDeleting(row)}
      editPermission={["customers:update"]}
      deletePermission={["customers:delete"]}
    />
  ));

  const status = list.filters.status ?? "";
  const activeFilters: ActiveFilter[] = status
    ? [{ key: "status", label: `Status: ${statusLabel[status as Customer["status"]]}` }]
    : [];

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    await del.mutateAsync(deleting.id);
    setDeleting(null);
  };

  const handleExport = () => {
    exportToCsv<Customer>("customers", list.rows, [
      { header: "Name", value: (r) => r.name },
      { header: "Email", value: (r) => r.email },
      { header: "Phone", value: (r) => r.phone },
      { header: "Country", value: (r) => r.country },
      { header: "Bookings", value: (r) => formatNumber(r.bookings) },
      { header: "Total spent", value: (r) => formatCurrency(r.totalSpent, r.currency) },
      { header: "Status", value: (r) => statusLabel[r.status] },
      { header: "Joined", value: (r) => formatDate(r.joinedAt) },
    ]);
  };

  return (
    <>
      <ResourceListView<Customer>
        list={list}
        searchPlaceholder="Search name, email or country…"
        activeFilters={activeFilters}
        selectable={false}
        filterControls={
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => list.setFilter("status", e.target.value)}
            options={[
              { value: "", label: "All statuses" },
              ...statusOptions(CUSTOMER_STATUSES),
            ]}
            wrapperClassName="w-44"
          />
        }
        primaryAction={
          <div className="flex items-center gap-2">
            <Can anyPermission={["customers:export"]}>
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
            <Can anyPermission={["customers:create"]}>
              <Button size="sm" onClick={() => setCreating(true)}>
                <Plus className="size-4" aria-hidden="true" />
                Add customer
              </Button>
            </Can>
          </div>
        }
        caption="Customers"
      />

      <Drawer
        open={creating || Boolean(editing)}
        onClose={closeForm}
        size="lg"
        title={editing ? "Edit customer" : "Add customer"}
      >
        {(creating || editing) && (
          <CustomerForm
            initial={editing ?? undefined}
            onDone={closeForm}
            onCancel={closeForm}
          />
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={del.isPending}
        title="Delete customer?"
        message={
          <>
            <strong className="font-semibold text-ink">{deleting?.name}</strong> will be
            permanently removed. This can&apos;t be undone.
          </>
        }
        confirmLabel="Delete customer"
      />
    </>
  );
}
