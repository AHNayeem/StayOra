"use client";

import type { ReactNode } from "react";
import { useResourceList } from "../../crud";
import { useQuery } from "../../data";
import { reconciliationColumns } from "./columns";
import {
  getReconciliationSummary,
  reconciliationKeys,
  reconciliationsService,
} from "./service";
import type { ReconciliationBatch } from "./types";

export function useReconciliations(
  rowActions?: (row: ReconciliationBatch) => ReactNode,
) {
  return useResourceList<ReconciliationBatch>({
    queryKey: reconciliationKeys.all,
    fetcher: (params, signal) => reconciliationsService.list(params, signal),
    columns: reconciliationColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "runAt", direction: "desc" },
    rowActions,
  });
}

export function useReconciliationSummary() {
  return useQuery({
    queryKey: reconciliationKeys.summary,
    queryFn: () => getReconciliationSummary(),
    staleTime: 60_000,
  });
}
