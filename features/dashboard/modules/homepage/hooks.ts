"use client";

import { type ReactNode } from "react";
import { useMutation } from "../../data";
import { useResourceList } from "../../crud";
import { homepageColumns } from "./columns";
import { homepageKeys, homepageService, moveBlock } from "./service";
import type { HomeBlock } from "./types";

/** List homepage blocks, optionally with a trailing row-actions column. */
export function useHomeBlocks(rowActions?: (row: HomeBlock) => ReactNode) {
  return useResourceList<HomeBlock>({
    queryKey: homepageKeys.all,
    fetcher: (params, signal) => homepageService.list(params, signal),
    columns: homepageColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "order", direction: "asc" },
    rowActions,
  });
}

export function useSetBlockEnabled() {
  return useMutation<HomeBlock, { id: string; enabled: boolean }>({
    mutationFn: ({ id, enabled }) => homepageService.update(id, { enabled }),
    invalidateKeys: [homepageKeys.all],
  });
}

/** Move a block up (-1) or down (+1); the service swaps order with its neighbour. */
export function useMoveBlock() {
  return useMutation<HomeBlock, { id: string; direction: -1 | 1 }>({
    mutationFn: ({ id, direction }) => moveBlock(id, direction),
    invalidateKeys: [homepageKeys.all],
  });
}
