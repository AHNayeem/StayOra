"use client";

import { useSyncExternalStore } from "react";
import { createCollectionStore } from "@/features/account/collection-store";

/**
 * Compare tray — the ids the traveller is holding side by side.
 *
 * Ids only, exactly like the wishlist: the catalogue is the source of truth for
 * what a listing *is*, this store only records which ones are in the tray. A
 * hard cap keeps the comparison table readable and the intent honest — four
 * columns is what fits before a comparison stops being one.
 *
 * Deliberately free of any catalogue import. The tray shell mounts on every
 * public page, and pulling the listing index in here would put the whole
 * catalogue in the bundle of pages that show no listings at all.
 */
const KEY = "otithee:compare";
const EVENT = `${KEY}:change`;

/** Most listings a traveller can hold in the tray at once. */
export const COMPARE_LIMIT = 4;

const store = createCollectionStore<string>({
  key: KEY,
  getId: (id) => id,
  seed: () => [],
});

/** Reactive ids currently in the tray, in the order they were added. */
export const useCompareIds = store.useAll;

/** Reactive tray size. */
export const useCompareCount = store.useCount;

export type CompareToggleResult = "added" | "removed" | "full";

/**
 * Add or remove a listing. Returns `"full"` (and changes nothing) when the tray
 * is already at {@link COMPARE_LIMIT} — the caller surfaces that to the user.
 */
export function toggleCompare(id: string): CompareToggleResult {
  if (store.has(id)) {
    store.remove(id);
    return "removed";
  }
  if (store.get().length >= COMPARE_LIMIT) return "full";
  // Appended, not prepended: the tray reads left-to-right in the order chosen.
  store.add(id, false);
  return "added";
}

export function removeFromCompare(id: string): void {
  store.remove(id);
}

export function clearCompare(): void {
  store.replaceAll([]);
}

/** Reactive membership check for one listing (drives the card's toggle). */
export function useIsComparing(id: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener(EVENT, cb);
      window.addEventListener("storage", cb);
      return () => {
        window.removeEventListener(EVENT, cb);
        window.removeEventListener("storage", cb);
      };
    },
    () => store.has(id),
    () => false,
  );
}
