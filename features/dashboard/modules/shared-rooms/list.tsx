"use client";

import { useState } from "react";
import { Download, Plus } from "lucide-react";
import { ConfirmDialog, ResourceListView, RowActions } from "../../crud";
import { Button, Drawer, Select } from "../../ui";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { labelMap, statusOptions } from "../../lib/status";
import { exportToCsv } from "../../lib/export-csv";
import { useSharedRooms, useDeleteSharedRoom } from "./hooks";
import { SharedRoomForm } from "./form";
import { SHARED_ROOM_STATUSES, type SharedRoom } from "./types";

const statusLabel = labelMap(SHARED_ROOM_STATUSES);

/** Shared rooms catalog list — search, status facet, create, per-row edit and delete. */
export function SharedRoomsList() {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<SharedRoom | null>(null);
  const [deleting, setDeleting] = useState<SharedRoom | null>(null);
  const del = useDeleteSharedRoom();

  const list = useSharedRooms((row) => (
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
    ? [{ key: "status", label: `Status: ${statusLabel[status as SharedRoom["status"]]}` }]
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
    exportToCsv<SharedRoom>("shared-rooms", list.rows, [
      { header: "Name", value: (row) => row.name },
      { header: "City", value: (row) => row.city },
      { header: "Country", value: (row) => row.country },
      { header: "Beds", value: (row) => row.beds },
      { header: "Price / bed", value: (row) => row.pricePerBed },
      { header: "Currency", value: (row) => row.currency },
      { header: "Status", value: (row) => statusLabel[row.status] },
      { header: "Updated", value: (row) => row.updatedAt },
    ]);
  };

  return (
    <>
      <ResourceListView<SharedRoom>
        list={list}
        searchPlaceholder="Search property, city or country…"
        activeFilters={activeFilters}
        selectable={false}
        filterControls={
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => list.setFilter("status", e.target.value)}
            options={[
              { value: "", label: "All statuses" },
              ...statusOptions(SHARED_ROOM_STATUSES),
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
                Add shared room
              </Button>
            </Can>
          </div>
        }
        caption="Shared rooms"
      />

      <Drawer
        open={creating || Boolean(editing)}
        onClose={closeForm}
        size="lg"
        title={editing ? "Edit shared room" : "New shared room"}
      >
        {(creating || editing) && (
          <SharedRoomForm
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
        title="Delete shared room?"
        message={
          <>
            <strong className="font-semibold text-ink">{deleting?.name}</strong> will
            be permanently removed from the catalog. This can&apos;t be undone.
          </>
        }
        confirmLabel="Delete shared room"
      />
    </>
  );
}
