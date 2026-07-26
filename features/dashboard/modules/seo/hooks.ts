"use client";

import { type ReactNode } from "react";
import { useMutation } from "../../data";
import { useResourceList } from "../../crud";
import { seoColumns } from "./columns";
import { seoKeys, seoService } from "./service";
import type { SeoFormValues } from "./schemas";
import type { SeoEntry } from "./types";

/** List SEO entries, optionally with a trailing row-actions column. */
export function useSeoEntries(rowActions?: (row: SeoEntry) => ReactNode) {
  return useResourceList<SeoEntry>({
    queryKey: seoKeys.all,
    fetcher: (params, signal) => seoService.list(params, signal),
    columns: seoColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "path", direction: "asc" },
    rowActions,
  });
}

export function useCreateSeoEntry() {
  return useMutation<SeoEntry, SeoFormValues>({
    mutationFn: (input) => seoService.create(input),
    invalidateKeys: [seoKeys.all],
  });
}

export function useUpdateSeoEntry() {
  return useMutation<SeoEntry, { id: string; input: SeoFormValues }>({
    mutationFn: ({ id, input }) => seoService.update(id, input),
    invalidateKeys: [seoKeys.all],
  });
}

export function useDeleteSeoEntry() {
  return useMutation<void, string>({
    mutationFn: (id) => seoService.remove(id),
    invalidateKeys: [seoKeys.all],
  });
}
