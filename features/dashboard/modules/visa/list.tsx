"use client";

import { useState } from "react";
import { Download, Plus } from "lucide-react";
import { ConfirmDialog, ResourceListView, RowActions } from "../../crud";
import { Button, Drawer, Select } from "../../ui";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { exportToCsv } from "../../lib/export-csv";
import { labelMap, statusOptions } from "../../lib/status";
import { useVisas, useDeleteVisa } from "./hooks";
import { VisaForm } from "./form";
import { VISA_STATUSES, type Visa } from "./types";

const statusLabel = labelMap(VISA_STATUSES);

/** Visa services catalog list — search, status facet, export, create, edit, delete. */
export function VisaList() {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Visa | null>(null);
  const [deleting, setDeleting] = useState<Visa | null>(null);
  const del = useDeleteVisa();

  const list = useVisas((row) => (
    <RowActions
      label={`Actions for ${row.country}`}
      onEdit={() => setEditing(row)}
      onDelete={() => setDeleting(row)}
      editPermission={["catalog:update"]}
      deletePermission={["catalog:delete"]}
    />
  ));

  const status = list.filters.status ?? "";
  const activeFilters: ActiveFilter[] = status
    ? [{ key: "status", label: `Status: ${statusLabel[status as Visa["status"]]}` }]
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
      <ResourceListView<Visa>
        list={list}
        searchPlaceholder="Search country or type…"
        activeFilters={activeFilters}
        selectable={false}
        filterControls={
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => list.setFilter("status", e.target.value)}
            options={[
              { value: "", label: "All statuses" },
              ...statusOptions(VISA_STATUSES),
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
                  exportToCsv("visas", list.rows, [
                    { header: "Country", value: (r) => r.country },
                    { header: "Type", value: (r) => r.type },
                    { header: "Processing days", value: (r) => r.processingDays },
                    { header: "Fee", value: (r) => r.fee },
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
                Add visa service
              </Button>
            </Can>
          </div>
        }
        caption="Visa services"
      />

      <Drawer
        open={creating || Boolean(editing)}
        onClose={closeForm}
        size="lg"
        title={editing ? "Edit visa service" : "New visa service"}
      >
        {(creating || editing) && (
          <VisaForm
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
        title="Delete visa service?"
        message={
          <>
            <strong className="font-semibold text-ink">{deleting?.country}</strong> will
            be permanently removed from the catalog. This can&apos;t be undone.
          </>
        }
        confirmLabel="Delete visa service"
      />
    </>
  );
}
