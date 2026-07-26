"use client";

import { type ReactNode } from "react";
import { useMutation } from "../../data";
import { useResourceList } from "../../crud";
import { transportColumns } from "./columns";
import { transportKeys, transportService } from "./service";
import type { TransportFormValues } from "./schemas";
import type { Transport } from "./types";

/** List transport options, optionally with a trailing row-actions column. */
export function useTransports(rowActions?: (row: Transport) => ReactNode) {
  return useResourceList<Transport>({
    queryKey: transportKeys.all,
    fetcher: (params, signal) => transportService.list(params, signal),
    columns: transportColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "name", direction: "asc" },
    rowActions,
  });
}

export function useCreateTransport() {
  return useMutation<Transport, TransportFormValues>({
    mutationFn: (input) => transportService.create(input),
    invalidateKeys: [transportKeys.all],
  });
}

export function useUpdateTransport() {
  return useMutation<Transport, { id: string; input: TransportFormValues }>({
    mutationFn: ({ id, input }) => transportService.update(id, input),
    invalidateKeys: [transportKeys.all],
  });
}

export function useDeleteTransport() {
  return useMutation<void, string>({
    mutationFn: (id) => transportService.remove(id),
    invalidateKeys: [transportKeys.all],
  });
}
