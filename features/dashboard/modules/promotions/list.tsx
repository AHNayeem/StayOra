"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ConfirmDialog, ResourceListView, RowActions } from "../../crud";
import { Drawer, Select, buttonVariants } from "../../ui";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { labelMap, statusOptions } from "../../lib/status";
import { useDeletePromotion, usePromotions } from "./hooks";
import { PromotionForm } from "./form";
import { PROMOTION_STATUSES, type Promotion } from "./types";

const statusLabel = labelMap(PROMOTION_STATUSES);

/** Promotions list — search, status facet, create, per-row edit and delete. */
export function PromotionsList() {
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [deleting, setDeleting] = useState<Promotion | null>(null);
  const del = useDeletePromotion();

  const list = usePromotions((row) => (
    <RowActions
      label={`Actions for ${row.name}`}
      onEdit={() => setEditing(row)}
      onDelete={() => setDeleting(row)}
      editPermission={["promotions:update"]}
      deletePermission={["promotions:delete"]}
    />
  ));

  const status = list.filters.status ?? "";
  const activeFilters: ActiveFilter[] = status
    ? [{ key: "status", label: `Status: ${statusLabel[status as Promotion["status"]]}` }]
    : [];

  const confirmDelete = async () => {
    if (!deleting) return;
    await del.mutateAsync(deleting.id);
    setDeleting(null);
  };

  return (
    <>
      <ResourceListView<Promotion>
        list={list}
        searchPlaceholder="Search name, code or type…"
        activeFilters={activeFilters}
        selectable={false}
        filterControls={
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => list.setFilter("status", e.target.value)}
            options={[
              { value: "", label: "All statuses" },
              ...statusOptions(PROMOTION_STATUSES),
            ]}
            wrapperClassName="w-44"
          />
        }
        primaryAction={
          <Can anyPermission={["promotions:create"]}>
            <Link
              href="/dashboard/promotions/create"
              className={buttonVariants({ size: "sm" })}
            >
              <Plus className="size-4" aria-hidden="true" />
              New promotion
            </Link>
          </Can>
        }
        caption="Promotions"
      />

      <Drawer
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        size="lg"
        title="Edit promotion"
      >
        {editing && (
          <PromotionForm
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
        title="Delete promotion?"
        message={
          <>
            <strong className="font-semibold text-ink">{deleting?.name}</strong> will
            be permanently removed. This can&apos;t be undone.
          </>
        }
        confirmLabel="Delete promotion"
      />
    </>
  );
}
