"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { ConfirmDialog, ResourceListView, RowActions } from "../../crud";
import { Button, Drawer, Select } from "../../ui";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { labelMap, statusOptions } from "../../lib/status";
import { useCmsPages, useDeleteCmsPage } from "./hooks";
import { CmsPageForm } from "./form";
import { CMS_STATUSES, type CmsPage } from "./types";

const statusLabel = labelMap(CMS_STATUSES);

/** CMS pages list — create, per-row edit and delete for pages, blog and FAQ. */
export function CmsPagesList() {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CmsPage | null>(null);
  const [deleting, setDeleting] = useState<CmsPage | null>(null);
  const del = useDeleteCmsPage();

  const list = useCmsPages((row) => (
    <RowActions
      label={`Actions for ${row.title}`}
      onEdit={() => setEditing(row)}
      onDelete={() => setDeleting(row)}
      editPermission={["cms:update"]}
      deletePermission={["cms:delete"]}
    />
  ));

  const status = list.filters.status ?? "";
  const activeFilters: ActiveFilter[] = status
    ? [{ key: "status", label: `Status: ${statusLabel[status as CmsPage["status"]]}` }]
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
      <ResourceListView<CmsPage>
        list={list}
        searchPlaceholder="Search title, slug or type…"
        activeFilters={activeFilters}
        selectable={false}
        filterControls={
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => list.setFilter("status", e.target.value)}
            options={[
              { value: "", label: "All statuses" },
              ...statusOptions(CMS_STATUSES),
            ]}
            wrapperClassName="w-44"
          />
        }
        primaryAction={
          <Can anyPermission={["cms:create"]}>
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="size-4" aria-hidden="true" />
              New page
            </Button>
          </Can>
        }
        caption="CMS pages"
      />

      <Drawer
        open={creating || Boolean(editing)}
        onClose={closeForm}
        size="lg"
        title={editing ? "Edit page" : "New page"}
      >
        {(creating || editing) && (
          <CmsPageForm
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
        title="Delete page?"
        message={
          <>
            <strong className="font-semibold text-ink">{deleting?.title}</strong> will
            be permanently removed. This can&apos;t be undone.
          </>
        }
        confirmLabel="Delete page"
      />
    </>
  );
}
