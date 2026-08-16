"use client";

import { useMutation, useQuery } from "../../data";
import { useResourceList } from "../../crud";
import { membershipAdminService } from "../../domain/services";
import { membershipBillingService, type BillingOutcome } from "../../domain/membership-billing";
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

/**
 * Retry a declined renewal — what an operator does after the member updates
 * their card. Resets the dunning counter, so a success ends the dunning cycle.
 */
export function useRetryMembershipBilling() {
  const actor = useDomainActor();
  return useMutation<BillingOutcome | undefined, string>({
    mutationFn: async (id) => membershipBillingService.retry(id, Date.now(), actor),
    invalidateKeys: SIDE_EFFECTS,
  });
}

/** The memberships currently failing to bill — the recovery worklist. */
export function useDunningMemberships() {
  return useQuery<MembershipSubscription[]>({
    queryKey: ["membership", "dunning"],
    queryFn: async () => membershipBillingService.inDunning(),
    staleTime: 5_000,
  });
}

/** Advance one period by hand. */
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
