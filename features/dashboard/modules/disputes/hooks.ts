"use client";

import type { ReactNode } from "react";
import { useMutation, useQuery } from "../../data";
import { useResourceList } from "../../crud";
import { disputeColumns } from "./columns";
import { disputeKeys, disputesService, getDisputeSummary } from "./service";
import type { Dispute, DisputeStatus } from "./types";

export function useDisputes(rowActions?: (row: Dispute) => ReactNode) {
  return useResourceList<Dispute>({
    queryKey: disputeKeys.all,
    fetcher: (params, signal) => disputesService.list(params, signal),
    columns: disputeColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "openedAt", direction: "desc" },
    rowActions,
  });
}

export function useDisputeSummary() {
  return useQuery({
    queryKey: disputeKeys.summary,
    queryFn: () => getDisputeSummary(),
    staleTime: 60_000,
  });
}

/** Advance a dispute — submit evidence, accept liability, or record an outcome. */
export function useSetDisputeStatus() {
  return useMutation<Dispute, { id: string; status: DisputeStatus }>({
    mutationFn: ({ id, status }) => disputesService.update(id, { status }),
    invalidateKeys: [disputeKeys.all, disputeKeys.summary],
  });
}
