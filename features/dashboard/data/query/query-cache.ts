/**
 * A small, framework-agnostic query cache.
 *
 * This is the in-house "Query Layer": keyed caching, in-flight de-duplication,
 * staleness tracking and prefix invalidation — the parts a client actually needs
 * — without a heavyweight dependency. `useQuery`/`useMutation` subscribe to it
 * through `useSyncExternalStore`, so it stays compatible with the project's
 * `react-hooks/set-state-in-effect` lint rule. When a real backend and
 * server-driven tables arrive (Phase 4), this can be swapped for TanStack Query
 * behind the same hook surface.
 */

/** A structured cache key; serialized to a stable string internally. */
export type QueryKey = ReadonlyArray<string | number | boolean | null>;

import type { QueryStatus } from "../types";

/** Immutable snapshot handed to subscribers; reference-stable between changes. */
export interface QuerySnapshot<T = unknown> {
  status: QueryStatus;
  data: T | undefined;
  error: unknown;
  /** Epoch ms of the last successful load, or 0 if never. */
  updatedAt: number;
  /** True while a fetch is in flight (including background refetches). */
  isFetching: boolean;
}

interface CacheEntry {
  snapshot: QuerySnapshot;
  listeners: Set<() => void>;
  promise?: Promise<unknown>;
}

const IDLE: QuerySnapshot = {
  status: "idle",
  data: undefined,
  error: undefined,
  updatedAt: 0,
  isFetching: false,
};

export function serializeKey(key: QueryKey): string {
  return JSON.stringify(key);
}

export interface FetchOptions {
  /** Skip the network if cached data is newer than this (ms). Default 0. */
  staleTime?: number;
  /** Force a refetch even if fresh. */
  force?: boolean;
}

export class QueryCache {
  private entries = new Map<string, CacheEntry>();

  private ensure(key: string): CacheEntry {
    let entry = this.entries.get(key);
    if (!entry) {
      entry = { snapshot: IDLE, listeners: new Set() };
      this.entries.set(key, entry);
    }
    return entry;
  }

  /** Stable snapshot for `getSnapshot`; same reference until state changes. */
  getSnapshot(key: string): QuerySnapshot {
    return this.entries.get(key)?.snapshot ?? IDLE;
  }

  subscribe(key: string, listener: () => void): () => void {
    const entry = this.ensure(key);
    entry.listeners.add(listener);
    return () => {
      entry.listeners.delete(listener);
    };
  }

  private update(key: string, patch: Partial<QuerySnapshot>): void {
    const entry = this.ensure(key);
    entry.snapshot = { ...entry.snapshot, ...patch };
    for (const listener of entry.listeners) listener();
  }

  /**
   * Read-through fetch. De-dupes concurrent callers of the same key, respects
   * `staleTime`, and transitions the snapshot through loading → success/error.
   */
  fetch<T>(
    key: string,
    fetcher: (signal?: AbortSignal) => Promise<T>,
    { staleTime = 0, force = false }: FetchOptions = {},
  ): Promise<T> {
    const entry = this.ensure(key);

    if (entry.promise) return entry.promise as Promise<T>;

    const isFresh =
      !force &&
      entry.snapshot.status === "success" &&
      Date.now() - entry.snapshot.updatedAt < staleTime;
    if (isFresh) return Promise.resolve(entry.snapshot.data as T);

    this.update(key, {
      status: entry.snapshot.status === "success" ? "success" : "loading",
      isFetching: true,
      error: undefined,
    });

    const promise = (async () => {
      try {
        const data = await fetcher();
        this.update(key, {
          status: "success",
          data,
          error: undefined,
          updatedAt: Date.now(),
          isFetching: false,
        });
        return data;
      } catch (error) {
        this.update(key, { status: "error", error, isFetching: false });
        throw error;
      } finally {
        this.ensure(key).promise = undefined;
      }
    })();

    entry.promise = promise;
    return promise;
  }

  /** Imperatively seed/replace cached data (e.g. after a mutation). */
  setData<T>(key: string, data: T): void {
    this.update(key, {
      status: "success",
      data,
      error: undefined,
      updatedAt: Date.now(),
    });
  }

  /**
   * Invalidate cached entries. Passing a serialized key clears one; passing a
   * JSON key-prefix (e.g. `["notifications"`) clears every matching entry.
   * Cleared entries drop to `idle` so the next mount refetches.
   */
  invalidate(keyOrPrefix: string): void {
    for (const [key, entry] of this.entries) {
      if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
        entry.snapshot = IDLE;
        for (const listener of entry.listeners) listener();
      }
    }
  }

  clear(): void {
    this.entries.clear();
  }
}
