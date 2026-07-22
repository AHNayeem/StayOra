"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import {
  QueryCache,
  serializeKey,
  type FetchOptions,
  type QueryKey,
  type QuerySnapshot,
} from "./query-cache";

/**
 * Typed facade over {@link QueryCache} that speaks {@link QueryKey}s instead of
 * pre-serialized strings. This is what hooks and callers use; it keeps key
 * serialization in exactly one place.
 */
export interface QueryClient {
  fetch: <T>(
    key: QueryKey,
    fetcher: (signal?: AbortSignal) => Promise<T>,
    options?: FetchOptions,
  ) => Promise<T>;
  getSnapshot: (key: QueryKey) => QuerySnapshot;
  subscribe: (key: QueryKey, listener: () => void) => () => void;
  setData: <T>(key: QueryKey, data: T) => void;
  /** Invalidate a single exact key. */
  invalidate: (key: QueryKey) => void;
  /** Invalidate every key beginning with `prefix` (e.g. `["notifications"]`). */
  invalidatePrefix: (prefix: QueryKey) => void;
}

function createQueryClient(cache: QueryCache): QueryClient {
  return {
    fetch: (key, fetcher, options) =>
      cache.fetch(serializeKey(key), fetcher, options),
    getSnapshot: (key) => cache.getSnapshot(serializeKey(key)),
    subscribe: (key, listener) => cache.subscribe(serializeKey(key), listener),
    setData: (key, data) => cache.setData(serializeKey(key), data),
    invalidate: (key) => cache.invalidate(serializeKey(key)),
    invalidatePrefix: (prefix) => {
      // Strip the trailing "]" so the string matches any longer key array.
      const serialized = serializeKey(prefix);
      cache.invalidate(serialized.slice(0, -1));
    },
  };
}

const QueryClientContext = createContext<QueryClient | null>(null);

/**
 * Holds one {@link QueryCache} per provider instance (fresh per request on the
 * server, persistent across navigations on the client). Wrap the dashboard once.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  // Lazy init runs once; the client (and its cache) stays stable across renders.
  const [client] = useState(() => createQueryClient(new QueryCache()));

  return (
    <QueryClientContext.Provider value={client}>
      {children}
    </QueryClientContext.Provider>
  );
}

/** Access the active {@link QueryClient}. Throws outside {@link QueryProvider}. */
export function useQueryClient(): QueryClient {
  const client = useContext(QueryClientContext);
  if (!client) {
    throw new Error("useQueryClient must be used within a <QueryProvider>.");
  }
  return client;
}
