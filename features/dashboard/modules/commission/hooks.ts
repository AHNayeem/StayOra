"use client";

import { useResourceList } from "../../crud";
import { commissionColumns } from "./columns";
import { commissionKeys, commissionsService } from "./service";
import type { Commission } from "./types";

export function useCommissions() {
  return useResourceList<Commission>({
    queryKey: commissionKeys.all,
    fetcher: (params, signal) => commissionsService.list(params, signal),
    columns: commissionColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "createdAt", direction: "desc" },
  });
}
