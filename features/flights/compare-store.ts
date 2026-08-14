"use client";

import { useSyncExternalStore } from "react";
import { createCollectionStore } from "@/features/account/collection-store";

/**
 * Flight compare tray — the offer ids the traveller is holding side by side.
 *
 * Separate from the stay tray ({@link "@/features/discovery".toggleCompare})
 * rather than sharing one list, because the two compare different things: a stay
 * id resolves against the catalogue, a flight id replays the offer generator.
 * One mixed list would mean every reader guessing which kind each id is.
 *
 * Ids only, and that is enough: {@link "@/lib/mock/flights".offerFromId} rebuilds
 * the whole offer from its id, so a tray filled on the results page still
 * resolves after a reload or on a detail page that never ran the search.
 *
 * Deliberately free of any offer import — the tray shell mounts on every public
 * page, and pulling the flight generator in here would put it in the bundle of
 * pages that show no flights at all.
 */
const KEY = "otithee:flight-compare";
const EVENT = `${KEY}:change`;

/**
 * Most offers a traveller can hold at once.
 *
 * Four columns of itinerary, fare and inclusions is what fits on a laptop before
 * the table starts scrolling and the comparison stops being one.
 */
export const FLIGHT_COMPARE_LIMIT = 4;

const store = createCollectionStore<string>({
  key: KEY,
  getId: (id) => id,
  seed: () => [],
});

/** Reactive ids currently in the tray, in the order they were added. */
export const useFlightCompareIds = store.useAll;

/** Reactive tray size. */
export const useFlightCompareCount = store.useCount;

export type FlightCompareToggleResult = "added" | "removed" | "full";

/**
 * Add or remove an offer. Returns `"full"` (and changes nothing) when the tray is
 * already at {@link FLIGHT_COMPARE_LIMIT} — the caller surfaces that to the user.
 */
export function toggleFlightCompare(id: string): FlightCompareToggleResult {
  if (store.has(id)) {
    store.remove(id);
    return "removed";
  }
  if (store.get().length >= FLIGHT_COMPARE_LIMIT) return "full";
  // Appended, not prepended: the tray reads left-to-right in the order chosen.
  store.add(id, false);
  return "added";
}

export function removeFromFlightCompare(id: string): void {
  store.remove(id);
}

export function clearFlightCompare(): void {
  store.replaceAll([]);
}

/** Reactive membership check for one offer (drives the card's toggle). */
export function useIsComparingFlight(id: string): boolean {
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
