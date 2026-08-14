"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "../../data";
import { revenueService } from "../../domain/services";
import type { RevenueEntry, RevenueFilters } from "../../domain/revenue";
import { useDomainActor, useDomainScope } from "../../domain/use-domain";

export const revenueKeys = {
  all: ["revenue"] as const,
  center: (key: string) => ["revenue", "center", key] as const,
  ledger: (key: string) => ["revenue", "ledger", key] as const,
};

/** Stable cache key for a filter set — filters are plain data, so this is safe. */
function filterKey(filters: RevenueFilters, scopeKey: string): string {
  return `${scopeKey}|${JSON.stringify(filters)}`;
}

/**
 * Everything the Revenue Center renders, in one scoped call.
 *
 * The scope is the same row-level rule the rest of the domain applies: a
 * merchant principal sees only revenue attributable to its own bookings, an
 * agency only its own account.
 */
export function useRevenueCenter(filters: RevenueFilters) {
  const scope = useDomainScope();
  const key = filterKey(filters, scope.merchantId ?? scope.organizationId ?? "all");
  return useQuery({
    queryKey: revenueKeys.center(key),
    queryFn: () => revenueService.center(filters, scope),
    staleTime: 5_000,
  });
}

export function useRevenueLedger(filters: RevenueFilters) {
  const scope = useDomainScope();
  const key = filterKey(filters, scope.merchantId ?? scope.organizationId ?? "all");
  return useQuery<RevenueEntry[]>({
    queryKey: revenueKeys.ledger(key),
    queryFn: () => revenueService.ledger(filters, scope),
    staleTime: 5_000,
  });
}

export function useRevenueAdjustment() {
  const actor = useDomainActor();
  return useMutation<
    RevenueEntry,
    { amount: number; label: string; note?: string; merchantId?: string }
  >({
    mutationFn: (input) => revenueService.adjust(input, actor),
    invalidateKeys: [["revenue"], ["logs"], ["notifications"], ["overview"]],
  });
}

/** Local filter state for the Revenue Center toolbar. */
export function useRevenueFilters(initial: RevenueFilters = {}) {
  const [filters, setFilters] = useState<RevenueFilters>(initial);
  return useMemo(
    () => ({
      filters,
      set<K extends keyof RevenueFilters>(key: K, value: RevenueFilters[K]) {
        setFilters((prev) => {
          const next = { ...prev };
          if (value === "" || value === undefined) delete next[key];
          else next[key] = value;
          return next;
        });
      },
      clear: () => setFilters({}),
      activeCount: Object.keys(filters).length,
    }),
    [filters],
  );
}
