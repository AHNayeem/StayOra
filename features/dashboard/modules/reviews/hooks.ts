"use client";

import { type ReactNode } from "react";
import { useMutation } from "../../data";
import { useResourceList } from "../../crud";
import { reviewColumns } from "./columns";
import { reviewKeys, reviewsService } from "./service";
import type { Review, ReviewStatus } from "./types";

export function useReviews(rowActions?: (row: Review) => ReactNode) {
  return useResourceList<Review>({
    queryKey: reviewKeys.all,
    fetcher: (params, signal) => reviewsService.list(params, signal),
    columns: reviewColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "createdAt", direction: "desc" },
    initialFilters: { status: "pending" },
    rowActions,
  });
}

/** Moderate a review — approve, reject or flag. */
export function useModerateReview() {
  return useMutation<Review, { id: string; status: ReviewStatus }>({
    mutationFn: ({ id, status }) => reviewsService.update(id, { status }),
    invalidateKeys: [reviewKeys.all],
  });
}

/** Delete a review. */
export function useDeleteReview() {
  return useMutation<void, string>({
    mutationFn: (id) => reviewsService.remove(id),
    invalidateKeys: [reviewKeys.all],
  });
}
