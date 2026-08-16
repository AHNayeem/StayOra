"use client";

import { useMutation, useQuery } from "../../data";
import {
  commissionApprovalService,
  type CommissionChangeRequest,
  type SubmitChangeInput,
} from "../../domain/commission-approvals";
import { useDomainActor } from "../../domain/use-domain";

export const commissionApprovalKeys = {
  all: ["finance", "commission", "approvals"] as const,
  list: (params: string) =>
    ["finance", "commission", "approvals", "list", params] as const,
};

/** Approving a change rewrites the rate book, so the rule list must refetch too. */
const SIDE_EFFECTS = [
  ["finance"],
  ["revenue"],
  ["logs"],
  ["notifications"],
  ["menu", "badges"],
];

export function useCommissionChangeRequests(filters: Record<string, string> = {}) {
  const key = JSON.stringify(filters);
  return useQuery<CommissionChangeRequest[]>({
    queryKey: commissionApprovalKeys.list(key),
    queryFn: async () => {
      const page = await commissionApprovalService.list({
        page: 1,
        pageSize: 200,
        filters,
      });
      return page.items;
    },
  });
}

export function useSubmitCommissionChange() {
  const actor = useDomainActor();
  return useMutation<CommissionChangeRequest, SubmitChangeInput>({
    mutationFn: (input) => commissionApprovalService.submit(input, actor),
    invalidateKeys: SIDE_EFFECTS,
  });
}

export function useApproveCommissionChange() {
  const actor = useDomainActor();
  return useMutation<CommissionChangeRequest, { id: string; note?: string }>({
    mutationFn: ({ id, note }) => commissionApprovalService.approve(id, actor, note),
    invalidateKeys: SIDE_EFFECTS,
  });
}

export function useRejectCommissionChange() {
  const actor = useDomainActor();
  return useMutation<CommissionChangeRequest, { id: string; reason: string }>({
    mutationFn: ({ id, reason }) => commissionApprovalService.reject(id, reason, actor),
    invalidateKeys: SIDE_EFFECTS,
  });
}

export function useCancelCommissionChange() {
  const actor = useDomainActor();
  return useMutation<CommissionChangeRequest, { id: string; note?: string }>({
    mutationFn: ({ id, note }) => commissionApprovalService.cancel(id, actor, note),
    invalidateKeys: SIDE_EFFECTS,
  });
}
