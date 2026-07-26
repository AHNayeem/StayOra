"use client";

import { useQuery } from "../../data";
import { useResourceList } from "../../crud";
import { loginLogColumns } from "./columns";
import { loginLogKeys, loginLogsService, getLoginSummary } from "./service";
import type { LoginLog } from "./types";

/** List login attempts (most recent first). */
export function useLoginLogs() {
  return useResourceList<LoginLog>({
    queryKey: loginLogKeys.all,
    fetcher: (params, signal) => loginLogsService.list(params, signal),
    columns: loginLogColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "createdAt", direction: "desc" },
  });
}

export function useLoginSummary() {
  return useQuery({
    queryKey: loginLogKeys.summary,
    queryFn: () => getLoginSummary(),
    staleTime: 60_000,
  });
}
