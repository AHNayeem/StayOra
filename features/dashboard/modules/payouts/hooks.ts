"use client";

import { useResourceList } from "../../crud";
import { payoutColumns } from "./columns";
import { payoutKeys, payoutsService } from "./service";
import type { Payout } from "./types";

export function usePayouts() {
  return useResourceList<Payout>({
    queryKey: payoutKeys.all,
    fetcher: (params, signal) => payoutsService.list(params, signal),
    columns: payoutColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "createdAt", direction: "desc" },
  });
}
