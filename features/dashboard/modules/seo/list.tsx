"use client";

import { useState } from "react";
import { Download, Plus } from "lucide-react";
import { ConfirmDialog, ResourceListView, RowActions } from "../../crud";
import { Button, Drawer, Select } from "../../ui";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { formatDate } from "../../lib/format";
import { exportToCsv } from "../../lib/export-csv";
import { useDeleteSeoEntry, useSeoEntries } from "./hooks";
import { SeoForm } from "./form";
import type { SeoEntry } from "./types";

const INDEX_FILTER = [
  { value: "", label: "All pages" },
  { value: "true", label: "Indexed" },
  { value: "false", label: "No-index" },
];

/** SEO entries — indexing facet, create/edit drawer, delete, CSV export. */
export function SeoList() {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<SeoEntry | null>(null);
  const [deleting, setDeleting] = useState<SeoEntry | null>(null);
  const del = useDeleteSeoEntry();

  const list = useSeoEntries((row) => (
    <RowActions
      label={`Actions for ${row.path}`}
      onEdit={() => setEditing(row)}
      onDelete={() => setDeleting(row)}
      editPermission={["cms:update"]}
      deletePermission={["cms:delete"]}
    />
  ));

  const indexable = list.filters.indexable ?? "";
  const activeFilters: ActiveFilter[] = indexable
    ? [{ key: "indexable", label: indexable === "true" ? "Indexed" : "No-index" }]
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
    exportToCsv<SeoEntry>("seo-entries", list.rows, [
      { header: "Route", value: (r) => r.path },
      { header: "Title", value: (r) => r.title },
      { header: "Description", value: (r) => r.description },
      { header: "Canonical", value: (r) => r.canonical },
      { header: "OG image", value: (r) => r.ogImage },
      { header: "Indexable", value: (r) => (r.indexable ? "Yes" : "No") },
      { header: "Updated", value: (r) => formatDate(r.updatedAt) },
    ]);
  };

  return (
    <>
      <ResourceListView<SeoEntry>
        list={list}
        searchPlaceholder="Search route, title or description…"
        activeFilters={activeFilters}
        selectable={false}
        filterControls={
          <Select
            aria-label="Filter by indexing"
            value={indexable}
            onChange={(e) => list.setFilter("indexable", e.target.value)}
            options={INDEX_FILTER}
            wrapperClassName="w-40"
          />
        }
        primaryAction={
          <div className="flex items-center gap-2">
            <Can anyPermission={["cms:export"]}>
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
            <Can anyPermission={["cms:create"]}>
              <Button size="sm" onClick={() => setCreating(true)}>
                <Plus className="size-4" aria-hidden="true" />
                Add SEO entry
              </Button>
            </Can>
          </div>
        }
        caption="SEO entries"
      />

      <Drawer
        open={creating || Boolean(editing)}
        onClose={closeForm}
        size="lg"
        title={editing ? "Edit SEO entry" : "New SEO entry"}
      >
        {(creating || editing) && (
          <SeoForm initial={editing ?? undefined} onDone={closeForm} onCancel={closeForm} />
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={del.isPending}
        title="Delete SEO entry?"
        message={
          <>
            Meta tags for{" "}
            <strong className="font-semibold text-ink">{deleting?.path}</strong> will be
            removed and the route will fall back to site defaults. This can&apos;t be undone.
          </>
        }
        confirmLabel="Delete SEO entry"
      />
    </>
  );
}
