"use client";

import { useMutation, useQuery } from "../../data";
import { commissionRuleService } from "../../domain/services";
import type {
  CommissionContext,
  CommissionRule,
  CommissionRuleInput,
} from "../../domain/commission-rules";
import { useDomainActor } from "../../domain/use-domain";

export const commissionRuleKeys = {
  all: ["finance", "commission", "rules"] as const,
  preview: (key: string) => ["finance", "commission", "rules", "preview", key] as const,
  lifecycle: (id: string) => ["finance", "commission", "lifecycle", id] as const,
};

const SIDE_EFFECTS = [
  ["finance"],
  ["revenue"],
  ["logs"],
  ["notifications"],
  ["overview"],
];

export function useCommissionRules() {
  return useQuery<CommissionRule[]>({
    queryKey: commissionRuleKeys.all,
    queryFn: () => commissionRuleService.all(),
    staleTime: 5_000,
  });
}

export function useCreateCommissionRule() {
  const actor = useDomainActor();
  return useMutation<CommissionRule, CommissionRuleInput>({
    mutationFn: (input) => commissionRuleService.create(input, actor),
    invalidateKeys: SIDE_EFFECTS,
  });
}

export function useUpdateCommissionRule() {
  const actor = useDomainActor();
  return useMutation<CommissionRule, { id: string; input: Partial<CommissionRuleInput> }>({
    mutationFn: ({ id, input }) => commissionRuleService.update(id, input, actor),
    invalidateKeys: SIDE_EFFECTS,
  });
}

export function useDeleteCommissionRule() {
  const actor = useDomainActor();
  return useMutation<void, string>({
    mutationFn: (id) => commissionRuleService.remove(id, actor),
    invalidateKeys: SIDE_EFFECTS,
  });
}

/** Dry-run the rule book against a hypothetical booking. */
export function useCommissionPreview(ctx: CommissionContext, enabled = true) {
  return useQuery({
    queryKey: commissionRuleKeys.preview(JSON.stringify(ctx)),
    queryFn: () => commissionRuleService.preview(ctx),
    enabled,
    staleTime: 2_000,
  });
}

/** Accrual → finalisation → settlement → reversal for one booking. */
export function useCommissionLifecycle(bookingId: string | undefined) {
  return useQuery({
    queryKey: commissionRuleKeys.lifecycle(bookingId ?? "none"),
    queryFn: () => commissionRuleService.lifecycle(bookingId!),
    enabled: Boolean(bookingId),
  });
}
