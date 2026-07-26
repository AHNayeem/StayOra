"use client";

import { useState } from "react";
import { Download, Plus } from "lucide-react";
import { ConfirmDialog, ResourceListView, RowActions } from "../../crud";
import { Button, Drawer, Select } from "../../ui";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { formatDate } from "../../lib/format";
import { labelMap, statusOptions } from "../../lib/status";
import { exportToCsv } from "../../lib/export-csv";
import { useCategories, useDeleteCategory } from "./hooks";
import { CategoryForm } from "./form";
import { CATEGORY_STATUSES, type Category } from "./types";

const statusLabel = labelMap(CATEGORY_STATUSES);

/** Categories catalog list — search, status facet, create, per-row edit and delete. */
export function CategoriesList() {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const del = useDeleteCategory();

  const list = useCategories((row) => (
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
    ? [{ key: "status", label: `Status: ${statusLabel[status as Category["status"]]}` }]
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
    exportToCsv<Category>("categories", list.rows, [
      { header: "Name", value: (r) => r.name },
      { header: "Slug", value: (r) => r.slug },
      { header: "Group", value: (r) => r.group },
      { header: "Items", value: (r) => r.itemsCount },
      { header: "Status", value: (r) => statusLabel[r.status] },
      { header: "Updated", value: (r) => formatDate(r.updatedAt) },
    ]);
  };

  return (
    <>
      <ResourceListView<Category>
        list={list}
        searchPlaceholder="Search name or slug…"
        activeFilters={activeFilters}
        selectable={false}
        filterControls={
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => list.setFilter("status", e.target.value)}
            options={[
              { value: "", label: "All statuses" },
              ...statusOptions(CATEGORY_STATUSES),
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
                leftIcon={<Download className="size-4" />}
                onClick={handleExport}
                disabled={list.rows.length === 0}
              >
                Export
              </Button>
            </Can>
            <Can anyPermission={["catalog:create"]}>
              <Button size="sm" onClick={() => setCreating(true)}>
                <Plus className="size-4" aria-hidden="true" />
                Add category
              </Button>
            </Can>
          </div>
        }
        caption="Categories"
      />

      <Drawer
        open={creating || Boolean(editing)}
        onClose={closeForm}
        size="lg"
        title={editing ? "Edit category" : "New category"}
      >
        {(creating || editing) && (
          <CategoryForm
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
        title="Delete category?"
        message={
          <>
            <strong className="font-semibold text-ink">{deleting?.name}</strong> will
            be permanently removed from the catalog. This can&apos;t be undone.
          </>
        }
        confirmLabel="Delete category"
      />
    </>
  );
}
