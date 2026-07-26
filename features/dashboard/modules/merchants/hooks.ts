"use client";

import { type ReactNode } from "react";
import { useMutation, useQuery } from "../../data";
import { useResourceList } from "../../crud";
import { merchantColumns } from "./columns";
import { merchantKeys, merchantsService } from "./service";
import { getMerchantDetail, type MerchantDetail } from "./detail";
import type { CreateMerchantInput, Merchant, MerchantStatus } from "./types";

export function useMerchants(rowActions?: (row: Merchant) => ReactNode) {
  return useResourceList<Merchant>({
    queryKey: merchantKeys.all,
    fetcher: (params, signal) => merchantsService.list(params, signal),
    columns: merchantColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "name", direction: "asc" },
    rowActions,
  });
}

export function useMerchant(id: string) {
  return useQuery<Merchant>({
    queryKey: merchantKeys.detail(id),
    queryFn: (signal) => merchantsService.get(id, signal),
    enabled: Boolean(id),
  });
}

/** Full merchant profile for the detail page (refetches after status/commission edits). */
export function useMerchantDetail(id: string) {
  return useQuery<MerchantDetail | undefined>({
    queryKey: merchantKeys.fullDetail(id),
    queryFn: () => getMerchantDetail(id),
    enabled: Boolean(id),
  });
}

export function useCreateMerchant() {
  return useMutation<Merchant, CreateMerchantInput>({
    mutationFn: (input) => merchantsService.create(input),
    invalidateKeys: [merchantKeys.all],
  });
}

/** Change a merchant's status — approve, suspend, etc. */
export function useSetMerchantStatus() {
  return useMutation<Merchant, { id: string; status: MerchantStatus }>({
    mutationFn: ({ id, status }) => merchantsService.update(id, { status }),
    invalidateKeys: [merchantKeys.all],
  });
}

/** Update a merchant's profile (edit drawer). */
export function useUpdateMerchant() {
  return useMutation<Merchant, { id: string; input: Partial<Merchant> }>({
    mutationFn: ({ id, input }) => merchantsService.update(id, input),
    invalidateKeys: [merchantKeys.all],
  });
}

export function useDeleteMerchant() {
  return useMutation<void, string>({
    mutationFn: (id) => merchantsService.remove(id),
    invalidateKeys: [merchantKeys.all],
  });
}
