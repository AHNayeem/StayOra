"use client";

import { type ReactNode } from "react";
import { useMutation } from "../../data";
import { useResourceList } from "../../crud";
import { visaColumns } from "./columns";
import { visaKeys, visasService } from "./service";
import type { VisaFormValues } from "./schemas";
import type { Visa } from "./types";

/** List visa services, optionally with a trailing row-actions column. */
export function useVisas(rowActions?: (row: Visa) => ReactNode) {
  return useResourceList<Visa>({
    queryKey: visaKeys.all,
    fetcher: (params, signal) => visasService.list(params, signal),
    columns: visaColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "country", direction: "asc" },
    rowActions,
  });
}

export function useCreateVisa() {
  return useMutation<Visa, VisaFormValues>({
    mutationFn: (input) => visasService.create(input),
    invalidateKeys: [visaKeys.all],
  });
}

export function useUpdateVisa() {
  return useMutation<Visa, { id: string; input: VisaFormValues }>({
    mutationFn: ({ id, input }) => visasService.update(id, input),
    invalidateKeys: [visaKeys.all],
  });
}

export function useDeleteVisa() {
  return useMutation<void, string>({
    mutationFn: (id) => visasService.remove(id),
    invalidateKeys: [visaKeys.all],
  });
}
