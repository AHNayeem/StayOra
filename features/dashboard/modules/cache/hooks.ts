"use client";

import { type ReactNode } from "react";
import { useQuery, useMutation } from "../../data";
import { useResourceList } from "../../crud";
import { cacheColumns } from "./columns";
import { cacheKeys, cacheService, getCacheSummary, flushCache } from "./service";
import type { CacheStore } from "./types";

/** List cache stores, optionally with a trailing row-actions column. */
export function useCacheStores(rowActions?: (row: CacheStore) => ReactNode) {
  return useResourceList<CacheStore>({
    queryKey: cacheKeys.all,
    fetcher: (params, signal) => cacheService.list(params, signal),
    columns: cacheColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "name", direction: "asc" },
    rowActions,
  });
}

export function useCacheSummary() {
  return useQuery({
    queryKey: cacheKeys.summary,
    queryFn: () => getCacheSummary(),
    staleTime: 60_000,
  });
}

export function useFlushCache() {
  return useMutation<CacheStore, string>({
    mutationFn: (id) => flushCache(id),
    invalidateKeys: [cacheKeys.all, cacheKeys.summary],
  });
}
