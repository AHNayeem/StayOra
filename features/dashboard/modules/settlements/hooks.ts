"use client";

import { type ReactNode } from "react";
import { useMutation, useQuery } from "../../data";
import { useResourceList } from "../../crud";
import { useDomainActor, useDomainScope } from "../../domain/use-domain";
import { settlementService } from "../../domain/services";
import type { Booking, Settlement, SettlementStatus } from "../../domain/types";
import { settlementColumns } from "./columns";

export const settlementKeys = {
  all: ["finance", "settlements"] as const,
  bookings: (id: string) => ["finance", "settlements", "bookings", id] as const,
  merchantSummary: (id: string) => ["finance", "settlements", "merchant", id] as const,
  merchantBreakdown: (id: string) =>
    ["finance", "settlements", "merchant-breakdown", id] as const,
};

const SIDE_EFFECTS = [
  ["finance", "settlements"],
  ["finance", "commission"],
  ["notifications"],
  ["logs"],
  ["overview"],
];

/** Settlement batches, scoped (a merchant sees only their own payouts). */
export function useSettlements(rowActions?: (row: Settlement) => ReactNode) {
  const scope = useDomainScope();
  return useResourceList<Settlement>({
    queryKey: ["finance", "settlements", scope.merchantId ?? "all"],
    fetcher: (params) => settlementService.list(params, scope),
    columns: settlementColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "periodStart", direction: "desc" },
    rowActions,
  });
}

/** Bookings that make up one batch — the payout drill-down. */
export function useSettlementBookings(id: string, enabled: boolean) {
  const scope = useDomainScope();
  return useQuery<Booking[]>({
    queryKey: settlementKeys.bookings(id),
    queryFn: () => settlementService.bookings(id, scope),
    enabled: enabled && Boolean(id),
  });
}

/** Schedule / process / pay / hold a batch. */
export function useSettlementAdvance() {
  const actor = useDomainActor();
  return useMutation<Settlement, { id: string; to: SettlementStatus; note?: string }>({
    mutationFn: ({ id, to, note }) => settlementService.advance(id, to, { actor, note }),
    invalidateKeys: SIDE_EFFECTS,
  });
}

/** Merchant P&L for the earnings page. */
export function useMerchantFinancials(merchantId: string | undefined) {
  return useQuery({
    queryKey: settlementKeys.merchantSummary(merchantId ?? "none"),
    queryFn: () => settlementService.merchantSummary(merchantId!),
    enabled: Boolean(merchantId),
    staleTime: 10_000,
  });
}

/** A merchant's earnings cut by product, rate plan, destination and month. */
export function useMerchantBreakdown(merchantId: string | undefined) {
  return useQuery({
    queryKey: settlementKeys.merchantBreakdown(merchantId ?? "none"),
    queryFn: () => settlementService.merchantBreakdown(merchantId!),
    enabled: Boolean(merchantId),
    staleTime: 10_000,
  });
}
