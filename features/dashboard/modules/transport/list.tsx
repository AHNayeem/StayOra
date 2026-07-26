"use client";

import { useState } from "react";
import { Download, Plus } from "lucide-react";
import { ConfirmDialog, ResourceListView, RowActions } from "../../crud";
import { Button, Drawer, Select } from "../../ui";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { exportToCsv } from "../../lib/export-csv";
import { labelMap, statusOptions } from "../../lib/status";
import { useTransports, useDeleteTransport } from "./hooks";
import { TransportForm } from "./form";
import { TRANSPORT_STATUSES, type Transport } from "./types";

const statusLabel = labelMap(TRANSPORT_STATUSES);

/** Transport catalog list — search, status facet, export, create, edit, delete. */
export function TransportList() {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Transport | null>(null);
  const [deleting, setDeleting] = useState<Transport | null>(null);
  const del = useDeleteTransport();

  const list = useTransports((row) => (
    <RowActions
      label={`Actions for ${row.name}`}
      onEdit={() => setEditing(row)}
      onDelete={() => setDeleting(row)}
      editPermission={["catalog:update"]}
      deletePermission={["catalog:delete"]}
    />
  ));

  const status = list.filters.status ?? "";
  const activeFilters: ActiveFilter[] = status
    ? [{ key: "status", label: `Status: ${statusLabel[status as Transport["status"]]}` }]
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

  return (
    <>
      <ResourceListView<Transport>
        list={list}
        searchPlaceholder="Search service or route…"
        activeFilters={activeFilters}
        selectable={false}
        filterControls={
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => list.setFilter("status", e.target.value)}
            options={[
              { value: "", label: "All statuses" },
              ...statusOptions(TRANSPORT_STATUSES),
            ]}
            wrapperClassName="w-44"
          />
        }
        primaryAction={
          <div className="flex items-center gap-2">
            <Can anyPermission={["catalog:export"]}>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Download className="size-4" aria-hidden="true" />}
                disabled={list.rows.length === 0}
                onClick={() =>
                  exportToCsv("transport", list.rows, [
                    { header: "Name", value: (r) => r.name },
                    { header: "Type", value: (r) => r.type },
                    { header: "Route", value: (r) => r.route },
                    { header: "Seats", value: (r) => r.seats },
                    { header: "Price / trip", value: (r) => r.pricePerTrip },
                    { header: "Currency", value: (r) => r.currency },
                    { header: "Status", value: (r) => statusLabel[r.status] },
                    { header: "Updated", value: (r) => r.updatedAt },
                  ])
                }
              >
                Export
              </Button>
            </Can>
            <Can anyPermission={["catalog:create"]}>
              <Button size="sm" onClick={() => setCreating(true)}>
                <Plus className="size-4" aria-hidden="true" />
                Add transport
              </Button>
            </Can>
          </div>
        }
        caption="Transport"
      />

      <Drawer
        open={creating || Boolean(editing)}
        onClose={closeForm}
        size="lg"
        title={editing ? "Edit transport" : "New transport"}
      >
        {(creating || editing) && (
          <TransportForm
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
        title="Delete transport?"
        message={
          <>
            <strong className="font-semibold text-ink">{deleting?.name}</strong> will
            be permanently removed from the catalog. This can&apos;t be undone.
          </>
        }
        confirmLabel="Delete transport"
      />
    </>
  );
}
