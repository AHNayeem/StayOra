"use client";

import type { TravelerReview } from "@/types/traveler";
import { ACCOUNT_DATA } from "@/lib/mock/account-data";
import { createCollectionStore } from "./collection-store";

/**
 * Authored-reviews store — the reviews the traveler has written, persisted
 * client-side so writing, editing and deleting a review survives a reload.
 * Seeded from the mock service's authored reviews.
 */
const store = createCollectionStore<TravelerReview>({
  key: "stayora:reviews",
  getId: (r) => r.id,
  seed: () => ACCOUNT_DATA.reviews,
});

export const useAuthoredReviews = store.useAll;
export const useReviewCount = store.useCount;

export function addReview(review: TravelerReview): void {
  store.add(review);
}

export function updateReview(id: string, patch: Partial<TravelerReview>): void {
  store.update(id, patch);
}

export function deleteReview(id: string): void {
  store.remove(id);
}
