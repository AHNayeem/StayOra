"use client";

import { type ReactNode } from "react";
import {
  calendarSyncService,
  catalogueService,
  merchantService,
  type BankDetailsInput,
  type CatalogueItem,
  type ChannelProvider,
  type ChannelScope,
  type Merchant,
  type MerchantPerformance,
  type MerchantPlanId,
  type MerchantProfileInput,
  type MerchantProperty,
  type MerchantStaff,
  type MerchantStatus,
  type OnboardingProgress,
  type PropertyInput,
  type RegisterMerchantInput,
  type StaffInput,
  type SyncOutcome,
  type UploadDocumentInput,
} from "@/features/dashboard/domain";
import { useMutation, useQuery } from "../../data";
import { useResourceList } from "../../crud";
import { useDomainActor, useDomainScope } from "../../domain/use-domain";
import { merchantColumns } from "./columns";
import { merchantKeys } from "./service";

/** Keys invalidated by anything that changes a merchant record. */
const MERCHANT_KEYS = [merchantKeys.all];

export function useMerchants(rowActions?: (row: Merchant) => ReactNode) {
  const scope = useDomainScope();
  return useResourceList<Merchant>({
    queryKey: merchantKeys.all,
    fetcher: (params) => merchantService.list(params, scope),
    columns: merchantColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "name", direction: "asc" },
    rowActions,
  });
}

export function useMerchant(id: string) {
  const scope = useDomainScope();
  return useQuery<Merchant>({
    queryKey: merchantKeys.detail(id),
    queryFn: () => merchantService.get(id, scope),
    enabled: Boolean(id),
  });
}

/** The merchant's catalogue — needed by the checklist and the product screens. */
export function useMerchantCatalogue(id: string) {
  return useQuery<CatalogueItem[]>({
    queryKey: merchantKeys.catalogue(id),
    queryFn: () => catalogueService.forMerchant(id),
    enabled: Boolean(id),
  });
}

/**
 * Onboarding progress. Depends on the catalogue, so the "submit catalogue" and
 * "live on Otithee" steps tick over as listings move through review.
 */
export function useOnboardingProgress(id: string) {
  const catalogue = useMerchantCatalogue(id);
  const items = catalogue.data ?? [];
  return useQuery<OnboardingProgress>({
    queryKey: [...merchantKeys.progress(id), items.length, items.map((i) => i.status).join(",")],
    queryFn: () => merchantService.progress(id, items),
    enabled: Boolean(id) && !catalogue.isLoading,
  });
}

export function useMerchantPerformance(id: string) {
  return useQuery<MerchantPerformance>({
    queryKey: merchantKeys.performance(id),
    queryFn: () => merchantService.performance(id),
    enabled: Boolean(id),
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useRegisterMerchant() {
  const actor = useDomainActor();
  return useMutation<Merchant, RegisterMerchantInput>({
    mutationFn: (input) => merchantService.register(input, actor),
    invalidateKeys: MERCHANT_KEYS,
  });
}

export function useUpdateMerchantProfile() {
  const actor = useDomainActor();
  const scope = useDomainScope();
  return useMutation<Merchant, { id: string; input: MerchantProfileInput }>({
    mutationFn: ({ id, input }) => merchantService.updateProfile(id, input, actor, scope),
    invalidateKeys: MERCHANT_KEYS,
  });
}

/** Admin: move a merchant through the review lifecycle. */
export function useSetMerchantStatus() {
  const actor = useDomainActor();
  return useMutation<Merchant, { id: string; status: MerchantStatus; note?: string }>({
    mutationFn: ({ id, status, note }) => merchantService.setStatus(id, status, { note }, actor),
    invalidateKeys: MERCHANT_KEYS,
  });
}

/** Admin: renegotiate commission. Percent — one unit across the whole platform. */
export function useSetCommission() {
  const actor = useDomainActor();
  return useMutation<Merchant, { id: string; commissionRate: number }>({
    mutationFn: ({ id, commissionRate }) =>
      merchantService.setCommission(id, commissionRate, actor),
    invalidateKeys: MERCHANT_KEYS,
  });
}

export function useUploadDocument() {
  const actor = useDomainActor();
  const scope = useDomainScope();
  return useMutation<unknown, { id: string; input: UploadDocumentInput }>({
    mutationFn: ({ id, input }) => merchantService.uploadDocument(id, input, actor, scope),
    invalidateKeys: MERCHANT_KEYS,
  });
}

export function useRemoveDocument() {
  const actor = useDomainActor();
  const scope = useDomainScope();
  return useMutation<Merchant, { id: string; documentId: string }>({
    mutationFn: ({ id, documentId }) =>
      merchantService.removeDocument(id, documentId, actor, scope),
    invalidateKeys: MERCHANT_KEYS,
  });
}

export function useReviewDocument() {
  const actor = useDomainActor();
  return useMutation<
    Merchant,
    { id: string; documentId: string; status: "approved" | "rejected"; reason?: string }
  >({
    mutationFn: ({ id, documentId, status, reason }) =>
      merchantService.reviewDocument(id, documentId, { status, reason }, actor),
    invalidateKeys: MERCHANT_KEYS,
  });
}

export function useSubmitKyc() {
  const actor = useDomainActor();
  const scope = useDomainScope();
  return useMutation<
    Merchant,
    { id: string; owners: Parameters<typeof merchantService.submitKyc>[1] }
  >({
    mutationFn: ({ id, owners }) => merchantService.submitKyc(id, owners, actor, scope),
    invalidateKeys: MERCHANT_KEYS,
  });
}

export function useDecideKyc() {
  const actor = useDomainActor();
  return useMutation<
    Merchant,
    { id: string; status: "verified" | "rejected" | "under_review"; reason?: string }
  >({
    mutationFn: ({ id, status, reason }) => merchantService.decideKyc(id, { status, reason }, actor),
    invalidateKeys: MERCHANT_KEYS,
  });
}

export function useAcceptContract() {
  const actor = useDomainActor();
  const scope = useDomainScope();
  return useMutation<Merchant, { id: string; acceptedBy: string }>({
    mutationFn: ({ id, acceptedBy }) =>
      merchantService.acceptContract(id, { acceptedBy }, actor, scope),
    invalidateKeys: MERCHANT_KEYS,
  });
}

export function useSaveBankDetails() {
  const actor = useDomainActor();
  const scope = useDomainScope();
  return useMutation<Merchant, { id: string; input: BankDetailsInput }>({
    mutationFn: ({ id, input }) => merchantService.saveBankDetails(id, input, actor, scope),
    invalidateKeys: MERCHANT_KEYS,
  });
}

export function useDecideBank() {
  const actor = useDomainActor();
  return useMutation<Merchant, { id: string; status: "verified" | "rejected"; reason?: string }>({
    mutationFn: ({ id, status, reason }) => merchantService.decideBank(id, { status, reason }, actor),
    invalidateKeys: MERCHANT_KEYS,
  });
}

export function useSubmitApplication() {
  const actor = useDomainActor();
  const scope = useDomainScope();
  return useMutation<Merchant, string>({
    mutationFn: (id) => merchantService.submitApplication(id, actor, scope),
    invalidateKeys: MERCHANT_KEYS,
  });
}

// --- staff -----------------------------------------------------------------

export function useAddStaff() {
  const actor = useDomainActor();
  const scope = useDomainScope();
  return useMutation<MerchantStaff, { id: string; input: StaffInput }>({
    mutationFn: ({ id, input }) => merchantService.addStaff(id, input, actor, scope),
    invalidateKeys: MERCHANT_KEYS,
  });
}

export function useUpdateStaff() {
  const actor = useDomainActor();
  const scope = useDomainScope();
  return useMutation<
    MerchantStaff,
    { id: string; staffId: string; input: Partial<Pick<MerchantStaff, "role" | "status" | "propertyIds">> }
  >({
    mutationFn: ({ id, staffId, input }) =>
      merchantService.updateStaff(id, staffId, input, actor, scope),
    invalidateKeys: MERCHANT_KEYS,
  });
}

export function useRemoveStaff() {
  const actor = useDomainActor();
  const scope = useDomainScope();
  return useMutation<void, { id: string; staffId: string }>({
    mutationFn: ({ id, staffId }) => merchantService.removeStaff(id, staffId, actor, scope),
    invalidateKeys: MERCHANT_KEYS,
  });
}

// --- properties ------------------------------------------------------------

export function useAddProperty() {
  const actor = useDomainActor();
  const scope = useDomainScope();
  return useMutation<MerchantProperty, { id: string; input: PropertyInput }>({
    mutationFn: ({ id, input }) => merchantService.addProperty(id, input, actor, scope),
    invalidateKeys: MERCHANT_KEYS,
  });
}

export function useUpdateProperty() {
  const actor = useDomainActor();
  const scope = useDomainScope();
  return useMutation<
    MerchantProperty,
    { id: string; propertyId: string; input: Partial<PropertyInput> }
  >({
    mutationFn: ({ id, propertyId, input }) =>
      merchantService.updateProperty(id, propertyId, input, actor, scope),
    invalidateKeys: MERCHANT_KEYS,
  });
}

export function useRemoveProperty() {
  const actor = useDomainActor();
  const scope = useDomainScope();
  return useMutation<void, { id: string; propertyId: string }>({
    mutationFn: ({ id, propertyId }) =>
      merchantService.removeProperty(id, propertyId, actor, scope),
    invalidateKeys: MERCHANT_KEYS,
  });
}

// --- channel manager -------------------------------------------------------

export function useConnectChannel() {
  const actor = useDomainActor();
  const scope = useDomainScope();
  return useMutation<
    MerchantProperty,
    { id: string; propertyId: string; provider: ChannelProvider; externalRef: string; scopes: ChannelScope[] }
  >({
    mutationFn: ({ id, propertyId, provider, externalRef, scopes }) =>
      merchantService.connectChannel(id, propertyId, { provider, externalRef, scopes }, actor, scope),
    invalidateKeys: MERCHANT_KEYS,
  });
}

export function useDisconnectChannel() {
  const actor = useDomainActor();
  const scope = useDomainScope();
  return useMutation<MerchantProperty, { id: string; propertyId: string }>({
    mutationFn: ({ id, propertyId }) =>
      merchantService.disconnectChannel(id, propertyId, actor, scope),
    invalidateKeys: MERCHANT_KEYS,
  });
}

export function useCompleteChannelSync() {
  const actor = useDomainActor();
  const scope = useDomainScope();
  return useMutation<
    MerchantProperty,
    { id: string; propertyId: string; status: "connected" | "error"; message?: string }
  >({
    mutationFn: ({ id, propertyId, status, message }) =>
      merchantService.completeChannelSync(id, propertyId, { status, message }, actor, scope),
    invalidateKeys: MERCHANT_KEYS,
  });
}

/**
 * Pull the property's external calendar now. Unlike `useCompleteChannelSync`
 * (which only settles the status), this actually imports the blocks and drops
 * availability — see `domain/calendar-sync.ts`.
 */
export function useSyncCalendar() {
  const actor = useDomainActor();
  return useMutation<SyncOutcome, { id: string; propertyId: string }>({
    mutationFn: ({ id, propertyId }) => calendarSyncService.sync(id, propertyId, actor),
    invalidateKeys: MERCHANT_KEYS,
  });
}

export function usePauseCalendarSync() {
  const actor = useDomainActor();
  return useMutation<unknown, { id: string; propertyId: string }>({
    mutationFn: ({ id, propertyId }) => calendarSyncService.pause(id, propertyId, actor),
    invalidateKeys: MERCHANT_KEYS,
  });
}

export function useResumeCalendarSync() {
  const actor = useDomainActor();
  return useMutation<SyncOutcome, { id: string; propertyId: string }>({
    mutationFn: ({ id, propertyId }) => calendarSyncService.resume(id, propertyId, actor),
    invalidateKeys: MERCHANT_KEYS,
  });
}

// --- subscription ----------------------------------------------------------

export function useChangePlan() {
  const actor = useDomainActor();
  const scope = useDomainScope();
  return useMutation<Merchant, { id: string; planId: MerchantPlanId }>({
    mutationFn: ({ id, planId }) => merchantService.changePlan(id, planId, actor, scope),
    invalidateKeys: MERCHANT_KEYS,
  });
}

export function useCancelSubscription() {
  const actor = useDomainActor();
  const scope = useDomainScope();
  return useMutation<Merchant, string>({
    mutationFn: (id) => merchantService.cancelSubscription(id, actor, scope),
    invalidateKeys: MERCHANT_KEYS,
  });
}
