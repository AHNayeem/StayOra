"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";
import { getRevision, subscribe } from "@/features/dashboard/domain";

/**
 * Bind a component to the domain store.
 *
 * The store mutates its collections in place, so array identity is not a
 * reliable snapshot — the revision counter is. On the server the revision is
 * frozen at 0, which keeps SSR deterministic.
 */
export function useDomainRevision(): number {
  return useSyncExternalStore(subscribe, getRevision, () => 0);
}

/**
 * Derive a value from the domain store, recomputed whenever the store changes.
 *
 * Implemented as a real external-store read rather than a `useMemo` over the
 * revision: that is what lets React render the *server* value during hydration
 * and swap to the client value afterwards, instead of throwing a hydration
 * mismatch the moment the traveller has persisted demo state.
 *
 * `deps` are the inputs to the selector (an id, an email…). Pass them so the
 * cached snapshot is invalidated when they change.
 */
export function useDomainValue<T>(selector: () => T, deps: readonly unknown[] = []): T {
  const key = JSON.stringify(deps);
  const client = useRef<{ revision: number; key: string; value: T } | null>(null);
  const server = useRef<{ key: string; value: T } | null>(null);

  const getSnapshot = useCallback(() => {
    const revision = getRevision();
    const cached = client.current;
    if (cached && cached.revision === revision && cached.key === key) return cached.value;
    const next = { revision, key, value: selector() };
    client.current = next;
    return next.value;
    // `selector` is deliberately excluded: `key` encodes every input to it, and
    // including it would rebuild the snapshot getter on every render, which
    // `useSyncExternalStore` reads as a changed store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const getServerSnapshot = useCallback(() => {
    if (!server.current || server.current.key !== key) {
      server.current = { key, value: selector() };
    }
    return server.current.value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
