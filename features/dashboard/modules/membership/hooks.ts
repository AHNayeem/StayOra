"use client";

import { useMutation, useQuery } from "../../data";
import { useResourceList } from "../../crud";
import { membershipAdminService } from "../../domain/services";
import type {
  MembershipPlan,
  MembershipPlanInput,
  MembershipSubscription,
} from "../../domain/membership";
import { useDomainActor } from "../../domain/use-domain";
import { subscriptionColumns } from "./columns";

export const membershipKeys = {
  all: ["membership"] as const,
  plans: ["membership", "plans"] as const,
  summary: ["membership", "summary"] as const,
};

const SIDE_EFFECTS = [["membership"], ["revenue"], ["logs"], ["notifications"]];

export function useMembershipPlans() {
  return useQuery<MembershipPlan[]>({
    queryKey: membershipKeys.plans,
    queryFn: () => membershipAdminService.plans(),
    staleTime: 30_000,
  });
}

export function useMembershipSummary() {
  return useQuery({
    queryKey: membershipKeys.summary,
    queryFn: () => membershipAdminService.summary(),
    staleTime: 10_000,
  });
}

export function useSubscriptions(rowActions?: (row: MembershipSubscription) => React.ReactNode) {
  return useResourceList<MembershipSubscription>({
    queryKey: ["membership", "subscriptions"],
    fetcher: (params) => membershipAdminService.listSubscriptions(params),
    columns: subscriptionColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "startAt", direction: "desc" },
    rowActions,
  });
}

export function useUpdateMembershipPlan() {
  const actor = useDomainActor();
  return useMutation<MembershipPlan, { id: string; input: Partial<MembershipPlanInput> }>({
    mutationFn: ({ id, input }) => membershipAdminService.updatePlan(id, input, actor),
    invalidateKeys: SIDE_EFFECTS,
  });
}

export function useSubscribeMember() {
  const actor = useDomainActor();
  return useMutation<
    MembershipSubscription,
    { customerEmail: string; customerName: string; planId: string }
  >({
    mutationFn: (input) => membershipAdminService.subscribe(input, actor),
    invalidateKeys: SIDE_EFFECTS,
  });
}

export function useCancelMembership() {
  const actor = useDomainActor();
  return useMutation<MembershipSubscription, string>({
    mutationFn: (id) => membershipAdminService.cancel(id, actor),
    invalidateKeys: SIDE_EFFECTS,
  });
}

/** Simulated renewal — the prototype has no recurring billing. */
export function useRenewMembership() {
  const actor = useDomainActor();
  return useMutation<MembershipSubscription, string>({
    mutationFn: (id) => membershipAdminService.renew(id, actor),
    invalidateKeys: SIDE_EFFECTS,
  });
}

export function useRefundMembership() {
  const actor = useDomainActor();
  return useMutation<MembershipSubscription, { id: string; amount?: number }>({
    mutationFn: ({ id, amount }) => membershipAdminService.refund(id, amount, actor),
    invalidateKeys: SIDE_EFFECTS,
  });
}
