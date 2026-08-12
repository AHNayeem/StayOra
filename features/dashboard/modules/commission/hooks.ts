"use client";

import { useQuery } from "../../data";
import { useResourceList } from "../../crud";
import { useDomainScope } from "../../domain/use-domain";
import type { CommissionEntry } from "../../domain/types";
import { commissionColumns } from "./columns";
import { commissionKeys, commissionService } from "./service";

/** Commission ledger, scoped (a merchant sees only their own entries). */
export function useCommissions() {
  const scope = useDomainScope();
  return useResourceList<CommissionEntry>({
    queryKey: ["finance", "commission", scope.merchantId ?? "all"],
    fetcher: (params) => commissionService.list(params, scope),
    columns: commissionColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "createdAt", direction: "desc" },
  });
}

/** GMV / revenue / commission / settlement headline figures. */
export function usePlatformFinancials() {
  const scope = useDomainScope();
  return useQuery({
    queryKey: [...commissionKeys.summary(), scope.merchantId ?? "all"],
    queryFn: () => commissionService.platformSummary(scope),
    staleTime: 10_000,
  });
}

/** Commission grouped by merchant / product / segment / month. */
export function useCommissionBreakdown() {
  const scope = useDomainScope();
  return useQuery({
    queryKey: [...commissionKeys.breakdown(), scope.merchantId ?? "all"],
    queryFn: () => commissionService.breakdown(scope),
    staleTime: 10_000,
  });
}
