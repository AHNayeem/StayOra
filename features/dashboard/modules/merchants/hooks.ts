"use client";

import { useMutation, useQuery } from "../../data";
import { useResourceList } from "../../crud";
import { merchantColumns } from "./columns";
import { merchantKeys, merchantsService } from "./service";
import type { CreateMerchantInput, Merchant, MerchantStatus } from "./types";

export function useMerchants() {
  return useResourceList<Merchant>({
    queryKey: merchantKeys.all,
    fetcher: (params, signal) => merchantsService.list(params, signal),
    columns: merchantColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "name", direction: "asc" },
  });
}

export function useMerchant(id: string) {
  return useQuery<Merchant>({
    queryKey: merchantKeys.detail(id),
    queryFn: (signal) => merchantsService.get(id, signal),
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
