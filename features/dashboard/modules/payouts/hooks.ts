"use client";

import { type ReactNode } from "react";
import { useMutation } from "../../data";
import { useResourceList } from "../../crud";
import { payoutColumns } from "./columns";
import { payoutKeys, payoutsService } from "./service";
import type { Payout } from "./types";

/** List payouts, optionally with a trailing row-actions column. */
export function usePayouts(rowActions?: (row: Payout) => ReactNode) {
  return useResourceList<Payout>({
    queryKey: payoutKeys.all,
    fetcher: (params, signal) => payoutsService.list(params, signal),
    columns: payoutColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "createdAt", direction: "desc" },
    rowActions,
  });
}

export function useUpdatePayout() {
  return useMutation<Payout, { id: string; input: Partial<Payout> }>({
    mutationFn: ({ id, input }) => payoutsService.update(id, input),
    invalidateKeys: [payoutKeys.all],
  });
}
