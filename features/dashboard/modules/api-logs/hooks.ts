"use client";

import { useQuery } from "../../data";
import { useResourceList } from "../../crud";
import { apiLogColumns } from "./columns";
import { apiLogKeys, apiLogsService, getApiSummary } from "./service";
import type { ApiLog } from "./types";

/** List API requests (most recent first). */
export function useApiLogs() {
  return useResourceList<ApiLog>({
    queryKey: apiLogKeys.all,
    fetcher: (params, signal) => apiLogsService.list(params, signal),
    columns: apiLogColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "createdAt", direction: "desc" },
  });
}

export function useApiSummary() {
  return useQuery({
    queryKey: apiLogKeys.summary,
    queryFn: () => getApiSummary(),
    staleTime: 60_000,
  });
}
