"use client";

import { type ReactNode } from "react";
import { useMutation } from "../../data";
import { useResourceList } from "../../crud";
import { taxColumns } from "./columns";
import { taxKeys, taxesService } from "./service";
import type { TaxFormValues } from "./schemas";
import type { TaxRule, TaxStatus } from "./types";

export function useTaxes(rowActions?: (row: TaxRule) => ReactNode) {
  return useResourceList<TaxRule>({
    queryKey: taxKeys.all,
    fetcher: (params, signal) => taxesService.list(params, signal),
    columns: taxColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "name", direction: "asc" },
    rowActions,
  });
}

export function useCreateTax() {
  return useMutation<TaxRule, TaxFormValues>({
    mutationFn: (input) => taxesService.create(input),
    invalidateKeys: [taxKeys.all],
  });
}

export function useUpdateTax() {
  return useMutation<TaxRule, { id: string; input: TaxFormValues }>({
    mutationFn: ({ id, input }) => taxesService.update(id, input),
    invalidateKeys: [taxKeys.all],
  });
}

/** Toggle a rule active/inactive without opening the editor. */
export function useSetTaxStatus() {
  return useMutation<TaxRule, { id: string; status: TaxStatus }>({
    mutationFn: ({ id, status }) => taxesService.update(id, { status }),
    invalidateKeys: [taxKeys.all],
  });
}

export function useDeleteTax() {
  return useMutation<void, string>({
    mutationFn: (id) => taxesService.remove(id),
    invalidateKeys: [taxKeys.all],
  });
}
