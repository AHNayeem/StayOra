"use client";

import { useQuery } from "../../data";
import { useResourceList } from "../../crud";
import { storageColumns } from "./columns";
import { storageKeys, storageService, getStorageSummary } from "./service";
import type { StorageBucket } from "./types";

/** List storage buckets. */
export function useStorageBuckets() {
  return useResourceList<StorageBucket>({
    queryKey: storageKeys.all,
    fetcher: (params, signal) => storageService.list(params, signal),
    columns: storageColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "name", direction: "asc" },
  });
}

export function useStorageSummary() {
  return useQuery({
    queryKey: storageKeys.summary,
    queryFn: () => getStorageSummary(),
    staleTime: 60_000,
  });
}
