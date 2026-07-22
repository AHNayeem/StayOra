"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { type ApiError, toApiError } from "../errors";
import type { QueryStatus } from "../types";
import { serializeKey, type QueryKey } from "./query-cache";
import { useQueryClient } from "./query-provider";

export interface UseQueryOptions<T> {
  queryKey: QueryKey;
  /** Async loader; receives an abort signal for cancellation. */
  queryFn: (signal?: AbortSignal) => Promise<T>;
  /** When false, the query stays idle and never fetches. Default true. */
  enabled?: boolean;
  /** Serve cached data without refetching if newer than this (ms). Default 0. */
  staleTime?: number;
}

export interface UseQueryResult<T> {
  data: T | undefined;
  error: ApiError | undefined;
  status: QueryStatus;
  /** First load in progress with no data yet. */
  isLoading: boolean;
  /** Any fetch in progress, including background refetches. */
  isFetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  refetch: () => Promise<T | undefined>;
}

/**
 * Subscribe to a cached async read. Fetching, de-duplication and staleness live
 * in the {@link QueryCache}; this hook only wires a component to one key via
 * `useSyncExternalStore` (no effect-driven setState) and kicks off the load.
 */
export function useQuery<T>({
  queryKey,
  queryFn,
  enabled = true,
  staleTime = 0,
}: UseQueryOptions<T>): UseQueryResult<T> {
  const client = useQueryClient();
  const keyString = serializeKey(queryKey);

  const subscribe = useCallback(
    (listener: () => void) => client.subscribe(queryKey, listener),
    // queryKey content is captured by keyString; array identity is irrelevant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [client, keyString],
  );
  const getSnapshot = useCallback(
    () => client.getSnapshot(queryKey),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [client, keyString],
  );

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // queryFn is intentionally not a dependency: the query key encodes every input
  // that changes the result, so the fetcher captured when the key last changed is
  // always correct for that key.
  useEffect(() => {
    if (!enabled) return;
    void client
      .fetch(queryKey, (signal) => queryFn(signal), { staleTime })
      .catch(() => {
        /* error is captured in the cache snapshot */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, keyString, enabled, staleTime]);

  const refetch = useCallback(
    () =>
      client
        .fetch<T>(queryKey, (signal) => queryFn(signal), { force: true })
        .catch(() => undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [client, keyString],
  );

  return {
    data: snapshot.data as T | undefined,
    error: snapshot.error ? toApiError(snapshot.error) : undefined,
    status: snapshot.status,
    isLoading: snapshot.status === "loading",
    isFetching: snapshot.isFetching,
    isSuccess: snapshot.status === "success",
    isError: snapshot.status === "error",
    refetch,
  };
}
