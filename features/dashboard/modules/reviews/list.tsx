"use client";

import { ResourceListView } from "../../crud";
import { Button, Select } from "../../ui";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { labelMap, statusOptions } from "../../lib/status";
import { useModerateReview, useReviews } from "./hooks";
import { REVIEW_STATUSES, type Review } from "./types";

const statusLabel = labelMap(REVIEW_STATUSES);

/** Reviews moderation queue — defaults to pending, bulk approve/reject. */
export function ReviewsList() {
  const list = useReviews();
  const moderate = useModerateReview();

  const status = list.filters.status ?? "";
  const activeFilters: ActiveFilter[] = status
    ? [{ key: "status", label: `Status: ${statusLabel[status as Review["status"]]}` }]
    : [];

  const applyStatus = async (ids: string[], next: Review["status"]) => {
    for (const id of ids) await moderate.mutateAsync({ id, status: next });
    list.clearSelection();
  };

  return (
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
        <Can permissions={["reviews:approve"]}>
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
  );
}
