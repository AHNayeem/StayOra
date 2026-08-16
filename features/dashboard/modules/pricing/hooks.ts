"use client";

import { useMutation, useQuery } from "../../data";
import { pricingService, type PricingOverview } from "../../domain/pricing-service";
import type {
  ManualPriceOverride,
  PricingConfiguration,
  PricingConfigurationInput,
  PricingRule,
  PricingRuleInput,
  RatePlan,
  RatePlanId,
  RatePlanInput,
  RatePlanQuery,
  RuleQuery,
} from "../../domain/pricing";
import type { PriceOverrideInput, PropertyRef } from "../../domain/inventory";
import { useDomainActor } from "../../domain/use-domain";

/**
 * Query keys for the pricing module.
 *
 * Everything hangs off one `pricing` prefix so a single write can invalidate
 * the whole surface — a rule change moves the calendar, the overview tiles and
 * the rule list at once, and stale numbers on any of them would be worse than
 * a refetch.
 */
export const pricingKeys = {
  all: ["pricing"] as const,
  rules: (key: string) => ["pricing", "rules", key] as const,
  plans: (key: string) => ["pricing", "plans", key] as const,
  config: (scope: string) => ["pricing", "config", scope] as const,
  configs: () => ["pricing", "configs"] as const,
  overrides: (propertyId: string) => ["pricing", "overrides", propertyId] as const,
  overview: (key: string) => ["pricing", "overview", key] as const,
  anomalies: () => ["pricing", "anomalies"] as const,
};

/**
 * What a pricing write moves. The inventory calendar and the revenue manager
 * read the same resolved rates, so they are invalidated too.
 */
const SIDE_EFFECTS = [
  ["pricing"],
  ["inventory"],
  ["revenue-management"],
  ["catalog"],
  ["logs"],
];

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

export function usePricingRules(query: RuleQuery = {}) {
  const key = JSON.stringify(query);
  return useQuery<PricingRule[]>({
    queryKey: pricingKeys.rules(key),
    queryFn: () => pricingService.rules(query),
    staleTime: 5_000,
  });
}

export function useCreatePricingRule() {
  const actor = useDomainActor();
  return useMutation<PricingRule, PricingRuleInput>({
    mutationFn: (input) => pricingService.createRule(input, actor),
    invalidateKeys: SIDE_EFFECTS,
  });
}

export function useUpdatePricingRule() {
  const actor = useDomainActor();
  return useMutation<PricingRule, { id: string; input: Partial<PricingRuleInput> }>({
    mutationFn: ({ id, input }) => pricingService.updateRule(id, input, actor),
    invalidateKeys: SIDE_EFFECTS,
  });
}

export function useSetRuleStatus() {
  const actor = useDomainActor();
  return useMutation<PricingRule, { id: string; status: PricingRule["status"] }>({
    mutationFn: ({ id, status }) => pricingService.setRuleStatus(id, status, actor),
    invalidateKeys: SIDE_EFFECTS,
  });
}

export function useDuplicatePricingRule() {
  const actor = useDomainActor();
  return useMutation<PricingRule, string>({
    mutationFn: (id) => pricingService.duplicateRule(id, actor),
    invalidateKeys: SIDE_EFFECTS,
  });
}

export function useDeletePricingRule() {
  const actor = useDomainActor();
  return useMutation<void, string>({
    mutationFn: (id) => pricingService.removeRule(id, actor),
    invalidateKeys: SIDE_EFFECTS,
  });
}

// ---------------------------------------------------------------------------
// Rate plans
// ---------------------------------------------------------------------------

export function useRatePlans(query: RatePlanQuery = {}) {
  const key = JSON.stringify(query);
  return useQuery<RatePlan[]>({
    queryKey: pricingKeys.plans(key),
    queryFn: () => pricingService.ratePlans(query),
    staleTime: 5_000,
  });
}

export function useCreateRatePlan() {
  const actor = useDomainActor();
  return useMutation<RatePlan, RatePlanInput>({
    mutationFn: (input) => pricingService.createRatePlan(input, actor),
    invalidateKeys: SIDE_EFFECTS,
  });
}

export function useUpdateRatePlan() {
  const actor = useDomainActor();
  return useMutation<RatePlan, { id: RatePlanId; input: Partial<RatePlanInput> }>({
    mutationFn: ({ id, input }) => pricingService.updateRatePlan(id, input, actor),
    invalidateKeys: SIDE_EFFECTS,
  });
}

export function useDuplicateRatePlan() {
  const actor = useDomainActor();
  return useMutation<RatePlan, RatePlanId>({
    mutationFn: (id) => pricingService.duplicateRatePlan(id, actor),
    invalidateKeys: SIDE_EFFECTS,
  });
}

export function useDeleteRatePlan() {
  const actor = useDomainActor();
  return useMutation<{ archived: boolean }, RatePlanId>({
    mutationFn: (id) => pricingService.removeRatePlan(id, actor),
    invalidateKeys: SIDE_EFFECTS,
  });
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export function usePricingConfig(propertyId?: string) {
  return useQuery<PricingConfiguration>({
    queryKey: pricingKeys.config(propertyId ?? "global"),
    queryFn: () => pricingService.config(propertyId),
    staleTime: 5_000,
  });
}

export function usePricingConfigs() {
  return useQuery<PricingConfiguration[]>({
    queryKey: pricingKeys.configs(),
    queryFn: () => pricingService.configs(),
    staleTime: 5_000,
  });
}

export function useSavePricingConfig() {
  const actor = useDomainActor();
  return useMutation<
    PricingConfiguration,
    { scopeId: string | null; patch: Partial<PricingConfigurationInput> }
  >({
    mutationFn: ({ scopeId, patch }) => pricingService.saveConfig(scopeId, patch, actor),
    invalidateKeys: SIDE_EFFECTS,
  });
}

export function useClearPricingConfig() {
  const actor = useDomainActor();
  return useMutation<void, string>({
    mutationFn: (scopeId) => pricingService.clearConfig(scopeId, actor),
    invalidateKeys: SIDE_EFFECTS,
  });
}

// ---------------------------------------------------------------------------
// Overrides & analytics
// ---------------------------------------------------------------------------

export function usePriceOverrides(propertyId?: string) {
  return useQuery<ManualPriceOverride[]>({
    queryKey: pricingKeys.overrides(propertyId ?? "all"),
    queryFn: () => pricingService.overrides(propertyId),
    staleTime: 2_000,
  });
}

export function useSetPriceOverride() {
  const actor = useDomainActor();
  return useMutation<number, PriceOverrideInput & { property?: PropertyRef }>({
    mutationFn: (input) => pricingService.setOverride(input, actor),
    invalidateKeys: SIDE_EFFECTS,
  });
}

export function useRemovePriceOverride() {
  const actor = useDomainActor();
  return useMutation<number, { roomTypeId: string; from: string; to: string }>({
    mutationFn: ({ roomTypeId, from, to }) =>
      pricingService.removeOverride(roomTypeId, from, to, actor),
    invalidateKeys: SIDE_EFFECTS,
  });
}

export function usePricingOverview(
  property: PropertyRef | null,
  roomTypeId: string,
  from: string,
  days: number,
) {
  const key = `${property?.id ?? "-"}|${roomTypeId}|${from}|${days}`;
  return useQuery<PricingOverview | null>({
    queryKey: pricingKeys.overview(key),
    queryFn: () =>
      property
        ? pricingService.overview(property, roomTypeId, from, days)
        : Promise.resolve(null),
    enabled: Boolean(property && roomTypeId),
    staleTime: 5_000,
  });
}

/** Configurations worth a second look — the admin review list. */
export function usePricingAnomalies() {
  return useQuery<{ rule: PricingRule; reason: string }[]>({
    queryKey: pricingKeys.anomalies(),
    queryFn: () => pricingService.anomalies(),
    staleTime: 10_000,
  });
}
