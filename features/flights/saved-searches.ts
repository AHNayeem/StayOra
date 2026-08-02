"use client";

import type { FlightSearchQuery, SavedFlightSearch } from "@/types/flight";
import { CABIN_LABEL } from "@/lib/mock/fares";
import { airportLabel } from "@/lib/mock/airports";
import { createCollectionStore } from "@/features/account/collection-store";
import { queryKey } from "./query-url";

/**
 * Recent and saved flight searches.
 *
 * One store holds both: a search the traveller ran is added automatically and
 * `pinned: false`; pinning it flips the flag. Keeping them together means a
 * pinned search can't drop out of the recents cap and reappear as a duplicate,
 * which is exactly what two separate lists would produce.
 *
 * Built on the same `createCollectionStore` primitive as the wishlist and saved
 * cards, so it's SSR-safe and persists across sessions without a backend.
 */
const store = createCollectionStore<SavedFlightSearch>({
  key: "otithee:flight-searches",
  getId: (s) => s.id,
  seed: () => [],
});

/** How many unpinned recents we keep. Pinned searches are never evicted. */
const MAX_RECENTS = 8;

/** Human summary of a search, e.g. `"Dhaka (DAC) → Dubai (DXB) · 12 Aug · 2 adults"`. */
export function describeQuery(query: FlightSearchQuery): string {
  const first = query.legs[0];
  if (!first) return "New search";

  const route =
    query.legs.length > 2
      ? `${airportLabel(first.from)} → ${airportLabel(query.legs[query.legs.length - 1].to)} · ${query.legs.length} legs`
      : `${airportLabel(first.from)} ${query.tripType === "round-trip" ? "⇄" : "→"} ${airportLabel(first.to)}`;

  const date = new Date(`${first.date}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

  const { adults, children, infants } = query.passengers;
  const parts: string[] = [`${adults} adult${adults === 1 ? "" : "s"}`];
  if (children > 0) parts.push(`${children} child${children === 1 ? "" : "ren"}`);
  if (infants > 0) parts.push(`${infants} infant${infants === 1 ? "" : "s"}`);

  return `${route} · ${date} · ${parts.join(", ")} · ${CABIN_LABEL[query.cabin]}`;
}

/** Stable id for a search — identical searches never duplicate in the list. */
function idFor(query: FlightSearchQuery): string {
  return `fs_${queryKey(query)}`;
}

/**
 * Record that a search was run. Refreshes an existing entry's timestamp rather
 * than adding a second copy, and trims unpinned recents to {@link MAX_RECENTS}.
 * `nowIso` is supplied by the caller so this module never reads the wall clock.
 */
export function recordSearch(query: FlightSearchQuery, nowIso: string): void {
  const id = idFor(query);
  const existing = store.get().find((s) => s.id === id);

  store.add(
    {
      id,
      query,
      label: describeQuery(query),
      savedAt: nowIso,
      pinned: existing?.pinned ?? false,
    },
    true,
  );

  // Evict the oldest unpinned entries beyond the cap.
  const all = store.get();
  const unpinned = all.filter((s) => !s.pinned);
  if (unpinned.length > MAX_RECENTS) {
    const keep = new Set(unpinned.slice(0, MAX_RECENTS).map((s) => s.id));
    store.replaceAll(all.filter((s) => s.pinned || keep.has(s.id)));
  }
}

/** Pin or unpin a saved search. */
export function togglePinned(id: string): void {
  const entry = store.get().find((s) => s.id === id);
  if (entry) store.update(id, { pinned: !entry.pinned });
}

/** Remove a search from the list entirely. */
export function removeSearch(id: string): void {
  store.remove(id);
}

/** Clear every recent search, keeping pinned ones. */
export function clearRecents(): void {
  store.replaceAll(store.get().filter((s) => s.pinned));
}

/** Reactive list of all saved + recent searches, newest first. */
export const useFlightSearches = store.useAll;

/** Reactive pinned searches only. */
export function usePinnedSearches(): SavedFlightSearch[] {
  return store.useAll().filter((s) => s.pinned);
}

/** Reactive unpinned (recent) searches only. */
export function useRecentFlightSearches(): SavedFlightSearch[] {
  return store.useAll().filter((s) => !s.pinned);
}

/** Whether a query is already pinned (non-reactive; for event handlers). */
export function isPinned(query: FlightSearchQuery): boolean {
  return store.get().some((s) => s.id === idFor(query) && s.pinned);
}
