"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { ConfirmDialog, ResourceListView, RowActions } from "../../crud";
import { Button, Select } from "../../ui";
import { DropdownItem, DropdownSeparator } from "../../ui/dropdown-menu";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { labelMap, statusOptions } from "../../lib/status";
import { useDeleteReview, useModerateReview, useReviews } from "./hooks";
import { REVIEW_STATUSES, type Review } from "./types";

const statusLabel = labelMap(REVIEW_STATUSES);

/** Reviews moderation queue — defaults to pending; row + bulk approve/reject/delete. */
export function ReviewsList() {
  const [deleting, setDeleting] = useState<Review | null>(null);
  const moderate = useModerateReview();
  const del = useDeleteReview();

  const list = useReviews((row) => (
    <RowActions
      label={`Actions for review by ${row.guest}`}
      onDelete={() => setDeleting(row)}
      deletePermission={["reviews:delete"]}
      extra={
        <Can anyPermission={["reviews:approve"]}>
          {row.status !== "approved" && (
            <DropdownItem
              icon={<Check />}
              onSelect={() =>
                void moderate.mutateAsync({ id: row.id, status: "approved" })
              }
            >
              Approve
            </DropdownItem>
          )}
          {row.status !== "rejected" && (
            <DropdownItem
              icon={<X />}
              onSelect={() =>
                void moderate.mutateAsync({ id: row.id, status: "rejected" })
              }
            >
              Reject
            </DropdownItem>
          )}
          <DropdownSeparator />
        </Can>
      }
    />
  ));

  const status = list.filters.status ?? "";
  const activeFilters: ActiveFilter[] = status
    ? [{ key: "status", label: `Status: ${statusLabel[status as Review["status"]]}` }]
    : [];

  const applyStatus = async (ids: string[], next: Review["status"]) => {
    for (const id of ids) await moderate.mutateAsync({ id, status: next });
    list.clearSelection();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    await del.mutateAsync(deleting.id);
    setDeleting(null);
  };

  return (
    <>
      <ResourceListView<Review>
        list={list}
        searchPlaceholder="Search property, guest or comment…"
        activeFilters={activeFilters}
        filterControls={
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => list.setFilter("status", e.target.value)}
            options={[
              { value: "", label: "All statuses" },
              ...statusOptions(REVIEW_STATUSES),
            ]}
            wrapperClassName="w-44"
          />
        }
        bulkActions={(ids) => (
          <Can anyPermission={["reviews:approve"]}>
            <Button
              variant="outline"
              size="sm"
              loading={moderate.isPending}
              onClick={() => applyStatus(ids, "approved")}
            >
              Approve
            </Button>
            <Button
              variant="outline"
              size="sm"
              loading={moderate.isPending}
              onClick={() => applyStatus(ids, "rejected")}
            >
              Reject
            </Button>
          </Can>
        )}
        caption="Reviews"
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={del.isPending}
        title="Delete review?"
        message={
          <>
            The review by{" "}
            <strong className="font-semibold text-ink">{deleting?.guest}</strong>{" "}
            will be permanently removed.
          </>
        }
        confirmLabel="Delete review"
      />
    </>
  );
}
