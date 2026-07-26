"use client";

import { useState } from "react";
import { Download, Link2, Upload } from "lucide-react";
import { ConfirmDialog, ResourceListView, RowActions } from "../../crud";
import { Button, Drawer, Select, StatCard, StatCardSkeleton } from "../../ui";
import { DropdownItem } from "../../ui/dropdown-menu";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { formatDate, formatNumber } from "../../lib/format";
import { labelMap, statusOptions } from "../../lib/status";
import { exportToCsv } from "../../lib/export-csv";
import { toast } from "@/lib/toast";
import { useDeleteMedia, useMedia, useMediaSummary } from "./hooks";
import { formatBytes } from "./columns";
import { MediaForm } from "./form";
import { MEDIA_SEED } from "./data";
import { MEDIA_TYPES, type MediaAsset } from "./types";

const typeLabel = labelMap(MEDIA_TYPES);
const FOLDER_OPTIONS = Array.from(new Set(MEDIA_SEED.map((m) => m.folder)))
  .sort()
  .map((f) => ({ value: f, label: f }));

/** Media Library — asset table with upload, type/folder facets, copy-URL and delete. */
export function MediaList() {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<MediaAsset | null>(null);
  const del = useDeleteMedia();
  const summary = useMediaSummary();

  const copyUrl = (row: MediaAsset) => {
    void navigator.clipboard
      ?.writeText(row.url)
      .then(() => toast.success("Asset URL copied to clipboard"))
      .catch(() => toast.info(row.url));
  };

  const list = useMedia((row) => (
    <RowActions
      label={`Actions for ${row.name}`}
      onDelete={() => setDeleting(row)}
      deletePermission={["cms:delete"]}
      extra={
        <DropdownItem icon={<Link2 />} onSelect={() => copyUrl(row)}>
          Copy URL
        </DropdownItem>
      }
    />
  ));

  const type = list.filters.type ?? "";
  const folder = list.filters.folder ?? "";
  const activeFilters: ActiveFilter[] = [
    ...(type ? [{ key: "type", label: `Type: ${typeLabel[type as MediaAsset["type"]]}` }] : []),
    ...(folder ? [{ key: "folder", label: `Folder: ${folder}` }] : []),
  ];

  const confirmDelete = async () => {
    if (!deleting) return;
    await del.mutateAsync(deleting.id);
    setDeleting(null);
  };

  const handleExport = () => {
    exportToCsv<MediaAsset>("media-library", list.rows, [
      { header: "Name", value: (r) => r.name },
      { header: "Type", value: (r) => typeLabel[r.type] },
      { header: "Folder", value: (r) => r.folder },
      { header: "Dimensions", value: (r) => r.dimensions },
      { header: "Size", value: (r) => formatBytes(r.size) },
      { header: "URL", value: (r) => r.url },
      { header: "Uploaded by", value: (r) => r.uploadedBy },
      { header: "Uploaded", value: (r) => formatDate(r.uploadedAt) },
    ]);
  };

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summary.isLoading || !summary.data ? (
          Array.from({ length: 4 }, (_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Total assets" value={formatNumber(summary.data.totalAssets)} icon="FileImage" />
            <StatCard label="Images" value={formatNumber(summary.data.images)} icon="Image" />
            <StatCard label="Storage used" value={formatBytes(summary.data.storageUsed)} icon="HardDrive" />
            <StatCard label="Folders" value={formatNumber(summary.data.folders)} icon="Boxes" />
          </>
        )}
      </div>

      <ResourceListView<MediaAsset>
        list={list}
        searchPlaceholder="Search name, folder or uploader…"
        activeFilters={activeFilters}
        selectable={false}
        filterControls={
          <>
            <Select
              aria-label="Filter by type"
              value={type}
              onChange={(e) => list.setFilter("type", e.target.value)}
              options={[{ value: "", label: "All types" }, ...statusOptions(MEDIA_TYPES)]}
              wrapperClassName="w-40"
            />
            <Select
              aria-label="Filter by folder"
              value={folder}
              onChange={(e) => list.setFilter("folder", e.target.value)}
              options={[{ value: "", label: "All folders" }, ...FOLDER_OPTIONS]}
              wrapperClassName="w-44"
            />
          </>
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
              <Button size="sm" onClick={() => setUploading(true)}>
                <Upload className="size-4" aria-hidden="true" />
                Upload
              </Button>
            </Can>
          </div>
        }
        caption="Media assets"
      />

      <Drawer
        open={uploading}
        onClose={() => setUploading(false)}
        size="lg"
        title="Add media asset"
      >
        {uploading && <MediaForm onDone={() => setUploading(false)} onCancel={() => setUploading(false)} />}
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={del.isPending}
        title="Delete asset?"
        message={
          <>
            <strong className="font-semibold text-ink">{deleting?.name}</strong> will be
            permanently removed from the library. References in content will break. This
            can&apos;t be undone.
          </>
        }
        confirmLabel="Delete asset"
      />
    </>
  );
}
