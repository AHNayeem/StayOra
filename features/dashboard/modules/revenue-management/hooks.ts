"use client";

import { useMutation, useQuery } from "../../data";
import { revenueManagementService } from "../../domain/services";
import type { RecommendationRule, RecommendationRuleInput, Recommendation } from "../../domain/revenue-management";
import { useDomainActor, useDomainScope } from "../../domain/use-domain";

export const rmKeys = {
  all: ["revenue-management"] as const,
  rules: (propertyId?: string) =>
    ["revenue-management", "rules", propertyId ?? "all"] as const,
  pace: (key: string) => ["revenue-management", "pace", key] as const,
  performance: (key: string) => ["revenue-management", "performance", key] as const,
};

const SIDE_EFFECTS = [
  ["revenue-management"],
  ["inventory"],
  ["catalog"],
  ["logs"],
  ["notifications"],
];

export function useRecommendationRules(propertyId?: string) {
  return useQuery<RecommendationRule[]>({
    queryKey: rmKeys.rules(propertyId),
    queryFn: () => revenueManagementService.rules({ propertyId }),
    staleTime: 10_000,
  });
}

export function useCreateRecommendationRule() {
  const actor = useDomainActor();
  return useMutation<RecommendationRule, RecommendationRuleInput>({
    mutationFn: (input) => revenueManagementService.createRule(input, actor),
    invalidateKeys: SIDE_EFFECTS,
  });
}

export function useUpdateRecommendationRule() {
  const actor = useDomainActor();
  return useMutation<RecommendationRule, { id: string; input: Partial<RecommendationRuleInput> }>({
    mutationFn: ({ id, input }) => revenueManagementService.updateRule(id, input, actor),
    invalidateKeys: SIDE_EFFECTS,
  });
}

export function useDeleteRecommendationRule() {
  const actor = useDomainActor();
  return useMutation<void, string>({
    mutationFn: (id) => revenueManagementService.removeRule(id, actor),
    invalidateKeys: SIDE_EFFECTS,
  });
}

/** Apply a recommendation — writes an inventory override for that night. */
export function useApplyRecommendation() {
  const actor = useDomainActor();
  return useMutation<number, Recommendation>({
    mutationFn: (rec) => revenueManagementService.apply(rec, actor),
    invalidateKeys: SIDE_EFFECTS,
  });
}

/** Booking pace, scoped to the caller's merchant. */
export function useBookingPace(listingId?: string) {
  const scope = useDomainScope();
  const key = `${scope.merchantId ?? "all"}|${listingId ?? "all"}`;
  return useQuery({
    queryKey: rmKeys.pace(key),
    queryFn: () =>
      revenueManagementService.pace({ merchantId: scope.merchantId, listingId }),
    staleTime: 10_000,
  });
}

export function useBookingPerformance(listingId?: string) {
  const scope = useDomainScope();
  const key = `${scope.merchantId ?? "all"}|${listingId ?? "all"}`;
  return useQuery({
    queryKey: rmKeys.performance(key),
    queryFn: () =>
      revenueManagementService.performance({ merchantId: scope.merchantId, listingId }),
    staleTime: 10_000,
  });
}
