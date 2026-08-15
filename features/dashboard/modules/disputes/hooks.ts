"use client";

import type { ReactNode } from "react";
import {
  disputeService,
  type Dispute,
  type DisputeStatus,
  type DisputeSummary,
} from "@/features/dashboard/domain";
import { useMutation, useQuery } from "../../data";
import { useResourceList } from "../../crud";
import { useDomainActor, useDomainScope } from "../../domain/use-domain";
import { disputeColumns } from "./columns";
import { disputeKeys } from "./service";

const INVALIDATE = [disputeKeys.all, disputeKeys.summary];

export function useDisputes(rowActions?: (row: Dispute) => ReactNode) {
  const scope = useDomainScope();
  return useResourceList<Dispute>({
    queryKey: [...disputeKeys.all, scope.merchantId ?? "platform"],
    fetcher: (params) => disputeService.list(params, scope),
    columns: disputeColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "openedAt", direction: "desc" },
    rowActions,
  });
}

export function useDisputeSummary() {
  const scope = useDomainScope();
  return useQuery<DisputeSummary>({
    queryKey: [...disputeKeys.summary, scope.merchantId ?? "platform"],
    queryFn: () => disputeService.summary(scope),
    staleTime: 10_000,
  });
}

/** Merchant: answer the claim, with optional supporting evidence. */
export function useRespondToDispute() {
  const actor = useDomainActor();
  const scope = useDomainScope();
  return useMutation<
    Dispute,
    { id: string; response: string; evidence?: { label: string; fileName: string }[] }
  >({
    mutationFn: ({ id, response, evidence }) =>
      disputeService.respond(id, { response, evidence }, actor, scope),
    invalidateKeys: INVALIDATE,
  });
}

/** Merchant: concede the case. */
export function useAcceptDisputeLiability() {
  const actor = useDomainActor();
  const scope = useDomainScope();
  return useMutation<Dispute, { id: string; note?: string }>({
    mutationFn: ({ id, note }) => disputeService.acceptLiability(id, note, actor, scope),
    invalidateKeys: INVALIDATE,
  });
}

/** Platform: record the outcome. Merchants cannot reach these transitions. */
export function useDecideDispute() {
  const actor = useDomainActor();
  return useMutation<Dispute, { id: string; to: DisputeStatus; note?: string }>({
    mutationFn: ({ id, to, note }) => disputeService.decide(id, to, note, actor),
    invalidateKeys: INVALIDATE,
  });
}
