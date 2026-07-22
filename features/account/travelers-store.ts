"use client";

import type { SavedTraveler } from "@/types/traveler";
import { ACCOUNT_DATA } from "@/lib/mock/account-data";
import { createCollectionStore } from "./collection-store";

/**
 * Saved-travelers store — co-travelers / passengers the user can reuse at
 * checkout, persisted client-side with full add/edit/delete.
 */
const store = createCollectionStore<SavedTraveler>({
  key: "stayora:saved-travelers",
  getId: (t) => t.id,
  seed: () => ACCOUNT_DATA.savedTravelers,
});

export const useSavedTravelers = store.useAll;

export function addTraveler(traveler: SavedTraveler): void {
  store.add(traveler, false);
}

export function updateTraveler(id: string, patch: Partial<SavedTraveler>): void {
  store.update(id, patch);
}

export function removeTraveler(id: string): void {
  store.remove(id);
}
