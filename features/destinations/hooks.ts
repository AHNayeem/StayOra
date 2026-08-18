"use client";

/**
 * Client-side reads of the destination store.
 *
 * The public destination pages are server-rendered from the seed, which is all
 * the server can see: a destination the editor created lives in the browser's
 * `localStorage`. These hooks bridge the gap — the server's markup renders first,
 * then the store's real contents arrive in the effect immediately after
 * hydration. It is the same seam `components/shared/cms-content.tsx` uses for
 * published CMS copy, and it disappears the day a real API backs destinations.
 */

import { useMemo, useSyncExternalStore } from "react";
import type { Destination } from "@/types/destination";
import { destinationRepository } from "./repository";
import { filterDestinations, type DestinationQuery } from "./service";

const { subscribe, snapshot, seedSnapshot } = destinationRepository;

/** A store that never changes — only its server/client snapshots differ. */
const neverChanges = () => () => {};

/**
 * `false` while the server's markup is being rendered or hydrated, `true` once
 * React is running on the client.
 *
 * Read through `useSyncExternalStore` rather than an effect: setting state in an
 * effect trips the project's cascading-render rule, and this is the same
 * mechanism the store snapshots already use.
 */
function useHydrated(): boolean {
  return useSyncExternalStore(
    neverChanges,
    () => true,
    () => false,
  );
}

/** Every destination in the store, whatever its status. */
export function useAllDestinations(): Destination[] {
  return useSyncExternalStore(subscribe, snapshot, seedSnapshot);
}

/**
 * Destinations matching `query` — published only unless the query says
 * otherwise, exactly as the async service getters behave.
 */
export function useDestinations(query: DestinationQuery = {}): Destination[] {
  const rows = useAllDestinations();
  // Queries are built inline at call sites, so compare by value rather than by
  // object identity or every render recomputes the list.
  const key = JSON.stringify(query);
  return useMemo(
    () => filterDestinations(rows, JSON.parse(key) as DestinationQuery),
    [rows, key],
  );
}

/**
 * One destination by slug, or `undefined` when no such published destination
 * exists.
 *
 * `resolved` is what callers act on: it is `false` for the hydration pass, where
 * only the server's seed is visible, and `true` once the browser's store has
 * been read. A 404 must wait for `resolved` — otherwise a destination created in
 * the dashboard would flash "not found" on every visit.
 */
export function useDestination(
  slug: string,
  options: { preview?: boolean } = {},
): { destination: Destination | undefined; resolved: boolean } {
  const rows = useAllDestinations();
  const hydrated = useHydrated();

  const destination = useMemo(() => {
    const found = rows.find((row) => row.slug === slug);
    if (!found) return undefined;
    return options.preview || found.status === "published" ? found : undefined;
  }, [rows, slug, options.preview]);

  return { destination, resolved: hydrated };
}

/** Countries with at least one published destination, for filter controls. */
export function useDestinationCountries(): string[] {
  const rows = useAllDestinations();
  return useMemo(() => {
    const countries = new Set(
      rows.filter((row) => row.status === "published").map((row) => row.country),
    );
    return [...countries].sort((a, b) => a.localeCompare(b));
  }, [rows]);
}
