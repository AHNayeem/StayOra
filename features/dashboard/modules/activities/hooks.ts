"use client";

import { type ReactNode } from "react";
import { useMutation } from "../../data";
import { useResourceList } from "../../crud";
import { activityColumns } from "./columns";
import { activityKeys, activitiesService } from "./service";
import type { ActivityFormValues } from "./schemas";
import type { Activity } from "./types";

/** List activities, optionally with a trailing row-actions column. */
export function useActivities(rowActions?: (row: Activity) => ReactNode) {
  return useResourceList<Activity>({
    queryKey: activityKeys.all,
    fetcher: (params, signal) => activitiesService.list(params, signal),
    columns: activityColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "name", direction: "asc" },
    rowActions,
  });
}

export function useCreateActivity() {
  return useMutation<Activity, ActivityFormValues>({
    mutationFn: (input) => activitiesService.create(input),
    invalidateKeys: [activityKeys.all],
  });
}

export function useUpdateActivity() {
  return useMutation<Activity, { id: string; input: ActivityFormValues }>({
    mutationFn: ({ id, input }) => activitiesService.update(id, input),
    invalidateKeys: [activityKeys.all],
  });
}

export function useDeleteActivity() {
  return useMutation<void, string>({
    mutationFn: (id) => activitiesService.remove(id),
    invalidateKeys: [activityKeys.all],
  });
}
