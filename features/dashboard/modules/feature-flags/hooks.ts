"use client";

import { useMutation, useQuery } from "../../data";
import { useDomainActor } from "../../domain/use-domain";
import type { FeatureFlagRecord } from "../../feature-flags/flag-store";
import type { RoleId } from "../../rbac/types";
import { featureFlagKeys, featureFlagService } from "./service";

const INVALIDATE = [featureFlagKeys.all];

export function useFeatureFlagRecords() {
  return useQuery<FeatureFlagRecord[]>({
    queryKey: featureFlagKeys.list(),
    queryFn: () => featureFlagService.list(),
  });
}

export function useSetFlagEnabled() {
  const actor = useDomainActor();
  return useMutation<FeatureFlagRecord[], { key: string; enabled: boolean }>({
    mutationFn: ({ key, enabled }) => featureFlagService.setEnabled(key, enabled, actor),
    invalidateKeys: INVALIDATE,
  });
}

export function useSetFlagRoles() {
  const actor = useDomainActor();
  return useMutation<FeatureFlagRecord[], { key: string; roles: RoleId[] }>({
    mutationFn: ({ key, roles }) => featureFlagService.setRoles(key, roles, actor),
    invalidateKeys: INVALIDATE,
  });
}

export function useResetFlag() {
  const actor = useDomainActor();
  return useMutation<FeatureFlagRecord[], string>({
    mutationFn: (key) => featureFlagService.reset(key, actor),
    invalidateKeys: INVALIDATE,
  });
}

export function useResetAllFlags() {
  const actor = useDomainActor();
  return useMutation<FeatureFlagRecord[], void>({
    mutationFn: () => featureFlagService.resetAll(actor),
    invalidateKeys: INVALIDATE,
  });
}
