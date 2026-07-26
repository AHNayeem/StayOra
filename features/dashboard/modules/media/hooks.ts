"use client";

import { type ReactNode } from "react";
import { useQuery, useMutation } from "../../data";
import { useResourceList } from "../../crud";
import { mediaColumns } from "./columns";
import { mediaKeys, mediaService, getMediaSummary } from "./service";
import type { MediaFormValues } from "./schemas";
import type { MediaAsset } from "./types";

/** List media assets, optionally with a trailing row-actions column. */
export function useMedia(rowActions?: (row: MediaAsset) => ReactNode) {
  return useResourceList<MediaAsset>({
    queryKey: mediaKeys.all,
    fetcher: (params, signal) => mediaService.list(params, signal),
    columns: mediaColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "uploadedAt", direction: "desc" },
    rowActions,
  });
}

export function useMediaSummary() {
  return useQuery({
    queryKey: mediaKeys.summary,
    queryFn: () => getMediaSummary(),
    staleTime: 60_000,
  });
}

export function useUploadMedia() {
  return useMutation<MediaAsset, MediaFormValues>({
    mutationFn: (input) => mediaService.create(input),
    invalidateKeys: [mediaKeys.all, mediaKeys.summary],
  });
}

export function useDeleteMedia() {
  return useMutation<void, string>({
    mutationFn: (id) => mediaService.remove(id),
    invalidateKeys: [mediaKeys.all, mediaKeys.summary],
  });
}
