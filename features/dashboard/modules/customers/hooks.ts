"use client";

import { type ReactNode } from "react";
import { useMutation } from "../../data";
import { useResourceList } from "../../crud";
import { customerColumns } from "./columns";
import { customerKeys, customersService } from "./service";
import type { CustomerFormValues } from "./schemas";
import type { Customer } from "./types";

/** List customers, optionally with a trailing row-actions column. */
export function useCustomers(rowActions?: (row: Customer) => ReactNode) {
  return useResourceList<Customer>({
    queryKey: customerKeys.all,
    fetcher: (params, signal) => customersService.list(params, signal),
    columns: customerColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "joinedAt", direction: "desc" },
    rowActions,
  });
}

export function useCreateCustomer() {
  return useMutation<Customer, CustomerFormValues>({
    mutationFn: (input) => customersService.create(input),
    invalidateKeys: [customerKeys.all],
  });
}

export function useUpdateCustomer() {
  return useMutation<Customer, { id: string; input: CustomerFormValues }>({
    mutationFn: ({ id, input }) => customersService.update(id, input),
    invalidateKeys: [customerKeys.all],
  });
}

export function useDeleteCustomer() {
  return useMutation<void, string>({
    mutationFn: (id) => customersService.remove(id),
    invalidateKeys: [customerKeys.all],
  });
}
