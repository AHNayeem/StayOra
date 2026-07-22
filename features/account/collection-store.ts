"use client";

import { useSyncExternalStore } from "react";

/**
 * createCollectionStore — a tiny reactive, localStorage-backed collection.
 *
 * Powers the traveler's user-owned lists (wishlist, saved cards, saved
 * travelers, authored reviews, notification read-state) with the same
 * module-singleton + `useSyncExternalStore` pattern as the locale/recent-search
 * stores: reads are SSR-safe (server snapshot = the seed) and mutations never
 * run through a `setState`-in-effect. On the first client read the store
 * hydrates from localStorage, falling back to `seed()` when nothing is stored.
 *
 * A real backend swaps these for `/me/*` mutations; the hooks stay identical.
 */
export interface CollectionStore<T> {
  /** Reactive snapshot of all items (the seed during SSR / first paint). */
  useAll: () => T[];
  /** Reactive count. */
  useCount: () => number;
  get: () => T[];
  add: (item: T, toFront?: boolean) => void;
  update: (id: string, patch: Partial<T>) => void;
  remove: (id: string) => void;
  replaceAll: (items: T[]) => void;
  has: (id: string) => boolean;
}

interface StoreConfig<T> {
  /** localStorage key (namespaced), e.g. "stayora:wishlist". */
  key: string;
  /** Stable id accessor for update/remove/has. */
  getId: (item: T) => string;
  /** Lazily-evaluated initial data when nothing is persisted yet. */
  seed: () => T[];
}

export function createCollectionStore<T>(config: StoreConfig<T>): CollectionStore<T> {
  const { key, getId, seed } = config;
  const EVENT = `${key}:change`;

  let snapshot: T[] = [];
  let serverSnapshot: T[] | null = null;
  let hydrated = false;

  function read(): T[] {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) return parsed as T[];
      }
    } catch {
      /* fall through to seed */
    }
    return seed();
  }

  function getSnapshot(): T[] {
    if (!hydrated) {
      snapshot = read();
      hydrated = true;
    }
    return snapshot;
  }

  // Stable reference across SSR renders (avoids an infinite loop in useSES).
  function getServerSnapshot(): T[] {
    if (!serverSnapshot) serverSnapshot = seed();
    return serverSnapshot;
  }

  function subscribe(cb: () => void): () => void {
    window.addEventListener(EVENT, cb);
    window.addEventListener("storage", cb);
    return () => {
      window.removeEventListener(EVENT, cb);
      window.removeEventListener("storage", cb);
    };
  }

  function commit(next: T[]): void {
    snapshot = next;
    hydrated = true;
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* storage unavailable — changes just won't persist */
    }
    window.dispatchEvent(new Event(EVENT));
  }

  return {
    useAll: () => useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot),
    useCount: () =>
      useSyncExternalStore(
        subscribe,
        () => getSnapshot().length,
        () => getServerSnapshot().length,
      ),
    get: getSnapshot,
    add: (item, toFront = true) => {
      const rest = getSnapshot().filter((x) => getId(x) !== getId(item));
      commit(toFront ? [item, ...rest] : [...rest, item]);
    },
    update: (id, patch) =>
      commit(getSnapshot().map((x) => (getId(x) === id ? { ...x, ...patch } : x))),
    remove: (id) => commit(getSnapshot().filter((x) => getId(x) !== id)),
    replaceAll: (items) => commit(items),
    has: (id) => getSnapshot().some((x) => getId(x) === id),
  };
}
