"use client";

import { type ReactNode } from "react";
import type { Payout, PayoutStatus, PayoutSummary } from "@/features/dashboard/domain";
import { useMutation, useQuery } from "../../data";
import { useResourceList } from "../../crud";
import { useDomainActor, useDomainScope } from "../../domain/use-domain";
import { payoutColumns } from "./columns";
import { payoutKeys, payoutService } from "./service";

/** List payouts, optionally with a trailing row-actions column. */
export function usePayouts(rowActions?: (row: Payout) => ReactNode) {
  const scope = useDomainScope();
  return useResourceList<Payout>({
    queryKey: [...payoutKeys.all, scope.merchantId ?? "platform"],
    fetcher: (params) => payoutService.list(params, scope),
    columns: payoutColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "scheduledFor", direction: "desc" },
    rowActions,
  });
}

export function usePayoutSummary() {
  const scope = useDomainScope();
  return useQuery<PayoutSummary>({
    queryKey: [...payoutKeys.summary, scope.merchantId ?? "platform"],
    queryFn: () => payoutService.summary(scope),
    staleTime: 10_000,
  });
}

/** Approve, hold, release, pay or fail a payout — via the settlement machine. */
export function useAdvancePayout() {
  const actor = useDomainActor();
  return useMutation<Payout, { id: string; to: PayoutStatus; note?: string }>({
    mutationFn: ({ id, to, note }) => payoutService.advance(id, to, { note, actor }),
    // Settlements move with it, so their caches have to go too.
    invalidateKeys: [payoutKeys.all, payoutKeys.summary, ["finance", "settlements"]],
  });
}
