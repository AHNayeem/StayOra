"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ConfirmDialog, ResourceListView, RowActions } from "../../crud";
import { Drawer, Select, buttonVariants } from "../../ui";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { labelMap, statusOptions } from "../../lib/status";
import { useBanners, useDeleteBanner } from "./hooks";
import { BannerForm } from "./form";
import {
  BANNER_PLACEMENTS,
  BANNER_STATUSES,
  type Banner,
} from "./types";

const statusLabel = labelMap(BANNER_STATUSES);
const placementLabel = labelMap(BANNER_PLACEMENTS);

/** Banners list — search, status + placement facets, create, per-row edit and delete. */
export function BannersList() {
  const [editing, setEditing] = useState<Banner | null>(null);
  const [deleting, setDeleting] = useState<Banner | null>(null);
  const del = useDeleteBanner();

  const list = useBanners((row) => (
    <RowActions
      label={`Actions for ${row.title}`}
      onEdit={() => setEditing(row)}
      onDelete={() => setDeleting(row)}
      editPermission={["promotions:update"]}
      deletePermission={["promotions:delete"]}
    />
  ));

  const status = list.filters.status ?? "";
  const placement = list.filters.placement ?? "";
  const activeFilters: ActiveFilter[] = [
    ...(status
      ? [{ key: "status", label: `Status: ${statusLabel[status as Banner["status"]]}` }]
      : []),
    ...(placement
      ? [{ key: "placement", label: `Placement: ${placementLabel[placement as Banner["placement"]]}` }]
      : []),
  ];

  const confirmDelete = async () => {
    if (!deleting) return;
    await del.mutateAsync(deleting.id);
    setDeleting(null);
  };

  return (
    <>
      <ResourceListView<Banner>
        list={list}
        searchPlaceholder="Search title, subtitle or button…"
        activeFilters={activeFilters}
        selectable={false}
        filterControls={
          <div className="flex items-center gap-2">
            <Select
              aria-label="Filter by placement"
              value={placement}
              onChange={(e) => list.setFilter("placement", e.target.value)}
              options={[
                { value: "", label: "All placements" },
                ...statusOptions(BANNER_PLACEMENTS),
              ]}
              wrapperClassName="w-44"
            />
            <Select
              aria-label="Filter by status"
              value={status}
              onChange={(e) => list.setFilter("status", e.target.value)}
              options={[
                { value: "", label: "All statuses" },
                ...statusOptions(BANNER_STATUSES),
              ]}
              wrapperClassName="w-40"
            />
          </div>
        }
        primaryAction={
          <Can anyPermission={["promotions:create"]}>
            <Link
              href="/dashboard/promotions/banners/create"
              className={buttonVariants({ size: "sm" })}
            >
              <Plus className="size-4" aria-hidden="true" />
              New banner
            </Link>
          </Can>
        }
        caption="Banners"
      />

      <Drawer
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        size="lg"
        title="Edit banner"
      >
        {editing && (
          <BannerForm
            initial={editing}
            onDone={() => setEditing(null)}
            onCancel={() => setEditing(null)}
          />
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={del.isPending}
        title="Delete banner?"
        message={
          <>
            <strong className="font-semibold text-ink">{deleting?.title}</strong> will
            be permanently removed. This can&apos;t be undone.
          </>
        }
        confirmLabel="Delete banner"
      />
    </>
  );
}
