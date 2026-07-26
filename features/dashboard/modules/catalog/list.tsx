"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ConfirmDialog, ResourceListView, RowActions } from "../../crud";
import { Drawer, Select, buttonVariants } from "../../ui";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { labelMap, statusOptions } from "../../lib/status";
import { useDeleteHotel, useHotels } from "./hooks";
import { HotelForm } from "./form";
import { HOTEL_STATUSES, type Hotel } from "./types";

const statusLabel = labelMap(HOTEL_STATUSES);

/** Hotels catalog list — search, status facet, create, per-row edit and delete. */
export function HotelsList() {
  const [editing, setEditing] = useState<Hotel | null>(null);
  const [deleting, setDeleting] = useState<Hotel | null>(null);
  const del = useDeleteHotel();

  const list = useHotels((row) => (
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
    ? [{ key: "status", label: `Status: ${statusLabel[status as Hotel["status"]]}` }]
    : [];

  const confirmDelete = async () => {
    if (!deleting) return;
    await del.mutateAsync(deleting.id);
    setDeleting(null);
  };

  return (
    <>
      <ResourceListView<Hotel>
        list={list}
        searchPlaceholder="Search property, city or country…"
        activeFilters={activeFilters}
        filterControls={
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => list.setFilter("status", e.target.value)}
            options={[
              { value: "", label: "All statuses" },
              ...statusOptions(HOTEL_STATUSES),
            ]}
            wrapperClassName="w-44"
          />
        }
        primaryAction={
          <Can anyPermission={["catalog:create"]}>
            <Link
              href="/dashboard/catalog/hotels/create"
              className={buttonVariants({ size: "sm" })}
            >
              <Plus className="size-4" aria-hidden="true" />
              Add hotel
            </Link>
          </Can>
        }
        caption="Hotels"
      />

      <Drawer
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        size="lg"
        title="Edit hotel"
      >
        {editing && (
          <HotelForm
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
        title="Delete hotel?"
        message={
          <>
            <strong className="font-semibold text-ink">{deleting?.name}</strong> will
            be permanently removed from the catalog. This can&apos;t be undone.
          </>
        }
        confirmLabel="Delete hotel"
      />
    </>
  );
}
