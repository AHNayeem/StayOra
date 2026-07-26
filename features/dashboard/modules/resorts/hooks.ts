"use client";

import { type ReactNode } from "react";
import { useMutation } from "../../data";
import { useResourceList } from "../../crud";
import { resortColumns } from "./columns";
import { resortKeys, resortsService } from "./service";
import type { ResortFormValues } from "./schemas";
import type { Resort } from "./types";

/** List resorts, optionally with a trailing row-actions column. */
export function useResorts(rowActions?: (row: Resort) => ReactNode) {
  return useResourceList<Resort>({
    queryKey: resortKeys.all,
    fetcher: (params, signal) => resortsService.list(params, signal),
    columns: resortColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "name", direction: "asc" },
    rowActions,
  });
}

export function useCreateResort() {
  return useMutation<Resort, ResortFormValues>({
    mutationFn: (input) => resortsService.create(input),
    invalidateKeys: [resortKeys.all],
  });
}

export function useUpdateResort() {
  return useMutation<Resort, { id: string; input: ResortFormValues }>({
    mutationFn: ({ id, input }) => resortsService.update(id, input),
    invalidateKeys: [resortKeys.all],
  });
}

export function useDeleteResort() {
  return useMutation<void, string>({
    mutationFn: (id) => resortsService.remove(id),
    invalidateKeys: [resortKeys.all],
  });
}
