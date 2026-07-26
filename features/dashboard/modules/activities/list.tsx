"use client";

import { useState } from "react";
import { Download, Plus } from "lucide-react";
import { ConfirmDialog, ResourceListView, RowActions } from "../../crud";
import { Button, Drawer, Select } from "../../ui";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { exportToCsv } from "../../lib/export-csv";
import { labelMap, statusOptions } from "../../lib/status";
import { useActivities, useDeleteActivity } from "./hooks";
import { ActivityForm } from "./form";
import { ACTIVITY_STATUSES, type Activity } from "./types";

const statusLabel = labelMap(ACTIVITY_STATUSES);

/** Activities catalog list — search, status facet, export, create, edit, delete. */
export function ActivitiesList() {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [deleting, setDeleting] = useState<Activity | null>(null);
  const del = useDeleteActivity();

  const list = useActivities((row) => (
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
    ? [{ key: "status", label: `Status: ${statusLabel[status as Activity["status"]]}` }]
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
      <ResourceListView<Activity>
        list={list}
        searchPlaceholder="Search activity, city or country…"
        activeFilters={activeFilters}
        selectable={false}
        filterControls={
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => list.setFilter("status", e.target.value)}
            options={[
              { value: "", label: "All statuses" },
              ...statusOptions(ACTIVITY_STATUSES),
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
                  exportToCsv("activities", list.rows, [
                    { header: "Name", value: (r) => r.name },
                    { header: "City", value: (r) => r.city },
                    { header: "Country", value: (r) => r.country },
                    { header: "Category", value: (r) => r.category },
                    { header: "Duration (hours)", value: (r) => r.durationHours },
                    { header: "Capacity", value: (r) => r.capacity },
                    { header: "Price", value: (r) => r.price },
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
                Add activity
              </Button>
            </Can>
          </div>
        }
        caption="Activities"
      />

      <Drawer
        open={creating || Boolean(editing)}
        onClose={closeForm}
        size="lg"
        title={editing ? "Edit activity" : "New activity"}
      >
        {(creating || editing) && (
          <ActivityForm
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
        title="Delete activity?"
        message={
          <>
            <strong className="font-semibold text-ink">{deleting?.name}</strong> will
            be permanently removed from the catalog. This can&apos;t be undone.
          </>
        }
        confirmLabel="Delete activity"
      />
    </>
  );
}
