"use client";

import { type ReactNode } from "react";
import { useMutation } from "../../data";
import { useResourceList } from "../../crud";
import { apartmentColumns } from "./columns";
import { apartmentKeys, apartmentsService } from "./service";
import type { ApartmentFormValues } from "./schemas";
import type { Apartment } from "./types";

/** List apartments, optionally with a trailing row-actions column. */
export function useApartments(rowActions?: (row: Apartment) => ReactNode) {
  return useResourceList<Apartment>({
    queryKey: apartmentKeys.all,
    fetcher: (params, signal) => apartmentsService.list(params, signal),
    columns: apartmentColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "name", direction: "asc" },
    rowActions,
  });
}

export function useCreateApartment() {
  return useMutation<Apartment, ApartmentFormValues>({
    mutationFn: (input) => apartmentsService.create(input),
    invalidateKeys: [apartmentKeys.all],
  });
}

export function useUpdateApartment() {
  return useMutation<Apartment, { id: string; input: ApartmentFormValues }>({
    mutationFn: ({ id, input }) => apartmentsService.update(id, input),
    invalidateKeys: [apartmentKeys.all],
  });
}

export function useDeleteApartment() {
  return useMutation<void, string>({
    mutationFn: (id) => apartmentsService.remove(id),
    invalidateKeys: [apartmentKeys.all],
  });
}
