"use client";

import { type ReactNode } from "react";
import { useMutation, useQuery } from "../../data";
import { useResourceList } from "../../crud";
import { useDomainActor, useDomainScope } from "../../domain/use-domain";
import type { Refund, RefundStatus } from "../../domain/types";
import { refundColumns } from "./columns";
import { REFUND_SIDE_EFFECT_KEYS, refundKeys, refundService } from "./service";

const SIDE_EFFECTS = REFUND_SIDE_EFFECT_KEYS.map((k) => [...k]);

/** Refund ledger, scoped to the caller (merchants see only their own). */
export function useRefunds(rowActions?: (row: Refund) => ReactNode) {
  const scope = useDomainScope();
  return useResourceList<Refund>({
    queryKey: ["finance", "refunds", scope.merchantId ?? "all"],
    fetcher: (params) => refundService.list(params, scope),
    columns: refundColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "requestedAt", direction: "desc" },
    rowActions,
  });
}

/** Console tiles: how much is awaiting a decision, processing, completed. */
export function useRefundSummary() {
  const scope = useDomainScope();
  return useQuery({
    queryKey: [...refundKeys.summary(), scope.merchantId ?? "all"],
    queryFn: () => refundService.summary(scope),
    staleTime: 10_000,
  });
}

export interface RefundDecisionVars {
  id: string;
  to: RefundStatus;
  note?: string;
}

/**
 * Advance a refund through review → processing → completed (or reject/fail).
 *
 * The domain rejects merchant-scoped callers outright, so the platform-only rule
 * holds even if a merchant somehow reached this mutation.
 */
export function useRefundDecision() {
  const actor = useDomainActor();
  const scope = useDomainScope();
  return useMutation<Refund, RefundDecisionVars>({
    mutationFn: ({ id, to, note }) =>
      refundService.advance(id, to, { actor, note, scope }),
    invalidateKeys: SIDE_EFFECTS,
  });
}

/** Raise a refund against a booking (support/admin path). */
export function useRequestRefund() {
  const actor = useDomainActor();
  const scope = useDomainScope();
  return useMutation<
    Refund,
    { bookingId: string; reason?: Refund["reason"]; note?: string; overridePercent?: number }
  >({
    mutationFn: ({ bookingId, reason, note, overridePercent }) =>
      refundService.request(bookingId, { reason, note, overridePercent, actor, scope }),
    invalidateKeys: SIDE_EFFECTS,
  });
}
