"use client";

import { useMutation, useQuery } from "../../data";
import { useResourceList } from "../../crud";
import { insuranceAdminService } from "../../domain/services";
import type { InsurancePlan, InsurancePlanInput, InsurancePolicy } from "../../domain/insurance";
import { useDomainActor, useDomainScope } from "../../domain/use-domain";
import { planColumns, policyColumns } from "./columns";

export const insuranceKeys = {
  all: ["insurance"] as const,
  summary: ["insurance", "summary"] as const,
  providers: ["insurance", "providers"] as const,
};

const SIDE_EFFECTS = [["insurance"], ["revenue"], ["logs"], ["notifications"]];

export function useInsurancePlans() {
  return useResourceList<InsurancePlan>({
    queryKey: ["insurance", "plans"],
    fetcher: (params) => insuranceAdminService.listPlans(params),
    columns: planColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "tier", direction: "asc" },
  });
}

export function useInsurancePolicies() {
  return useResourceList<InsurancePolicy>({
    queryKey: ["insurance", "policies"],
    fetcher: (params) => insuranceAdminService.listPolicies(params),
    columns: policyColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "purchasedAt", direction: "desc" },
  });
}

/** Premium, provider payable, platform revenue and the attach rate. */
export function useInsuranceSummary() {
  const scope = useDomainScope();
  return useQuery({
    queryKey: [...insuranceKeys.summary, scope.merchantId ?? "all"],
    queryFn: () => insuranceAdminService.summary(scope),
    staleTime: 10_000,
  });
}

export function useInsuranceProviders() {
  return useQuery({
    queryKey: insuranceKeys.providers,
    queryFn: () => insuranceAdminService.providers(),
    staleTime: 60_000,
  });
}

export function useUpdateInsurancePlan() {
  const actor = useDomainActor();
  return useMutation<InsurancePlan, { id: string; input: Partial<InsurancePlanInput> }>({
    mutationFn: ({ id, input }) => insuranceAdminService.updatePlan(id, input, actor),
    invalidateKeys: SIDE_EFFECTS,
  });
}
