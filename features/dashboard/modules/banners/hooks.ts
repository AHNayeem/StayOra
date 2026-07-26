"use client";

import { type ReactNode } from "react";
import { useMutation } from "../../data";
import { useResourceList } from "../../crud";
import { bannerColumns } from "./columns";
import { bannerKeys, bannersService } from "./service";
import type { BannerFormValues } from "./schemas";
import type { Banner } from "./types";

/** List banners, optionally with a trailing row-actions column. */
export function useBanners(rowActions?: (row: Banner) => ReactNode) {
  return useResourceList<Banner>({
    queryKey: bannerKeys.all,
    fetcher: (params, signal) => bannersService.list(params, signal),
    columns: bannerColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "priority", direction: "asc" },
    rowActions,
  });
}

export function useCreateBanner() {
  return useMutation<Banner, BannerFormValues>({
    mutationFn: (input) => bannersService.create(input),
    invalidateKeys: [bannerKeys.all],
  });
}

export function useUpdateBanner() {
  return useMutation<Banner, { id: string; input: BannerFormValues }>({
    mutationFn: ({ id, input }) => bannersService.update(id, input),
    invalidateKeys: [bannerKeys.all],
  });
}

export function useDeleteBanner() {
  return useMutation<void, string>({
    mutationFn: (id) => bannersService.remove(id),
    invalidateKeys: [bannerKeys.all],
  });
}
