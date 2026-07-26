"use client";

import { type ReactNode } from "react";
import { useQuery, useMutation } from "../../data";
import { useResourceList } from "../../crud";
import { queueColumns } from "./columns";
import { queueKeys, queuesService, getQueueSummary, retryQueueFailed } from "./service";
import type { Queue } from "./types";

/** List work queues, optionally with a trailing row-actions column. */
export function useQueues(rowActions?: (row: Queue) => ReactNode) {
  return useResourceList<Queue>({
    queryKey: queueKeys.all,
    fetcher: (params, signal) => queuesService.list(params, signal),
    columns: queueColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "name", direction: "asc" },
    rowActions,
  });
}

export function useQueueSummary() {
  return useQuery({
    queryKey: queueKeys.summary,
    queryFn: () => getQueueSummary(),
    staleTime: 60_000,
  });
}

export function useSetQueueStatus() {
  return useMutation<Queue, { id: string; status: Queue["status"] }>({
    mutationFn: ({ id, status }) => queuesService.update(id, { status }),
    invalidateKeys: [queueKeys.all, queueKeys.summary],
  });
}

export function useRetryQueue() {
  return useMutation<Queue, string>({
    mutationFn: (id) => retryQueueFailed(id),
    invalidateKeys: [queueKeys.all, queueKeys.summary],
  });
}
