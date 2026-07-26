"use client";

import { useResourceList } from "../../crud";
import { refundColumns } from "./columns";
import { refundKeys, refundsService } from "./service";
import type { Refund } from "./types";

export function useRefunds() {
  return useResourceList<Refund>({
    queryKey: refundKeys.all,
    fetcher: (params, signal) => refundsService.list(params, signal),
    columns: refundColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "createdAt", direction: "desc" },
  });
}
