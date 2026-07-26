"use client";

import { type ReactNode } from "react";
import { useQuery, useMutation } from "../../data";
import { useResourceList } from "../../crud";
import { cronColumns } from "./columns";
import { cronKeys, cronService, getCronSummary, runCronJob } from "./service";
import type { CronJob } from "./types";

/** List scheduled jobs, optionally with a trailing row-actions column. */
export function useCronJobs(rowActions?: (row: CronJob) => ReactNode) {
  return useResourceList<CronJob>({
    queryKey: cronKeys.all,
    fetcher: (params, signal) => cronService.list(params, signal),
    columns: cronColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "name", direction: "asc" },
    rowActions,
  });
}

export function useCronSummary() {
  return useQuery({
    queryKey: cronKeys.summary,
    queryFn: () => getCronSummary(),
    staleTime: 60_000,
  });
}

export function useSetCronStatus() {
  return useMutation<CronJob, { id: string; status: CronJob["status"] }>({
    mutationFn: ({ id, status }) => cronService.update(id, { status }),
    invalidateKeys: [cronKeys.all, cronKeys.summary],
  });
}

export function useRunCronJob() {
  return useMutation<CronJob, string>({
    mutationFn: (id) => runCronJob(id),
    invalidateKeys: [cronKeys.all, cronKeys.summary],
  });
}
