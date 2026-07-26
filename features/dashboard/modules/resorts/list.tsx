"use client";

import { useState } from "react";
import { Download, Plus } from "lucide-react";
import { ConfirmDialog, ResourceListView, RowActions } from "../../crud";
import { Button, Drawer, Select } from "../../ui";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { labelMap, statusOptions } from "../../lib/status";
import { exportToCsv } from "../../lib/export-csv";
import { useResorts, useDeleteResort } from "./hooks";
import { ResortForm } from "./form";
import { RESORT_STATUSES, type Resort } from "./types";

const statusLabel = labelMap(RESORT_STATUSES);

/** Resorts catalog list — search, status facet, create, per-row edit and delete. */
export function ResortsList() {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Resort | null>(null);
  const [deleting, setDeleting] = useState<Resort | null>(null);
  const del = useDeleteResort();

  const list = useResorts((row) => (
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
    ? [{ key: "status", label: `Status: ${statusLabel[status as Resort["status"]]}` }]
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
    exportToCsv<Resort>("resorts", list.rows, [
      { header: "Name", value: (row) => row.name },
      { header: "City", value: (row) => row.city },
      { header: "Country", value: (row) => row.country },
      { header: "Rooms", value: (row) => row.rooms },
      { header: "Rating", value: (row) => row.rating },
      { header: "Price / night", value: (row) => row.pricePerNight },
      { header: "Currency", value: (row) => row.currency },
      { header: "Status", value: (row) => statusLabel[row.status] },
      { header: "Updated", value: (row) => row.updatedAt },
    ]);
  };

  return (
    <>
      <ResourceListView<Resort>
        list={list}
        searchPlaceholder="Search resort, city or country…"
        activeFilters={activeFilters}
        selectable={false}
        filterControls={
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => list.setFilter("status", e.target.value)}
            options={[
              { value: "", label: "All statuses" },
              ...statusOptions(RESORT_STATUSES),
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
                onClick={handleExport}
                disabled={list.rows.length === 0}
                leftIcon={<Download className="size-4" aria-hidden="true" />}
              >
                Export
              </Button>
            </Can>
            <Can anyPermission={["catalog:create"]}>
              <Button size="sm" onClick={() => setCreating(true)}>
                <Plus className="size-4" aria-hidden="true" />
                Add resort
              </Button>
            </Can>
          </div>
        }
        caption="Resorts"
      />

      <Drawer
        open={creating || Boolean(editing)}
        onClose={closeForm}
        size="lg"
        title={editing ? "Edit resort" : "New resort"}
      >
        {(creating || editing) && (
          <ResortForm
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
        title="Delete resort?"
        message={
          <>
            <strong className="font-semibold text-ink">{deleting?.name}</strong> will
            be permanently removed from the catalog. This can&apos;t be undone.
          </>
        }
        confirmLabel="Delete resort"
      />
    </>
  );
}
