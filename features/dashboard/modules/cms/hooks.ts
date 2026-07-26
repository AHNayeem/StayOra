"use client";

import { type ReactNode } from "react";
import { useMutation } from "../../data";
import { useResourceList } from "../../crud";
import { cmsColumns } from "./columns";
import { cmsKeys, cmsService } from "./service";
import type { CmsPageFormValues } from "./schemas";
import type { CmsPage } from "./types";

/** List CMS pages, optionally with a trailing row-actions column. */
export function useCmsPages(rowActions?: (row: CmsPage) => ReactNode) {
  return useResourceList<CmsPage>({
    queryKey: cmsKeys.all,
    fetcher: (params, signal) => cmsService.list(params, signal),
    columns: cmsColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "updatedAt", direction: "desc" },
    rowActions,
  });
}

export function useCreateCmsPage() {
  return useMutation<CmsPage, CmsPageFormValues>({
    mutationFn: (input) => cmsService.create(input),
    invalidateKeys: [cmsKeys.all],
  });
}

export function useUpdateCmsPage() {
  return useMutation<CmsPage, { id: string; input: CmsPageFormValues }>({
    mutationFn: ({ id, input }) => cmsService.update(id, input),
    invalidateKeys: [cmsKeys.all],
  });
}

export function useDeleteCmsPage() {
  return useMutation<void, string>({
    mutationFn: (id) => cmsService.remove(id),
    invalidateKeys: [cmsKeys.all],
  });
}
