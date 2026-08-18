"use client";

import { type ReactNode } from "react";
import { useMutation, useQuery } from "../../data";
import { useResourceList } from "../../crud";
import {
  archiveDestination,
  publishDestination,
  unpublishDestination,
} from "@/features/destinations/service";
import type {
  Destination,
  DestinationInput,
  DestinationPatch,
  DestinationStatus,
} from "@/types/destination";
import { destinationColumns } from "./columns";
import {
  destinationKeys,
  destinationsService,
  getDestinationSummary,
} from "./service";

/** List destinations, optionally with a trailing row-actions column. */
export function useDestinationList(rowActions?: (row: Destination) => ReactNode) {
  return useResourceList<Destination>({
    queryKey: destinationKeys.all,
    fetcher: (params, signal) => destinationsService.list(params, signal),
    columns: destinationColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "updatedAt", direction: "desc" },
    rowActions,
  });
}

export function useDestinationSummary() {
  return useQuery({
    queryKey: destinationKeys.summary,
    queryFn: () => getDestinationSummary(),
    staleTime: 30_000,
  });
}

/** One destination for the edit screen. */
export function useDestination(id: string) {
  return useQuery({
    queryKey: destinationKeys.detail(id),
    queryFn: () => destinationsService.get(id),
  });
}

/** Keys every destination mutation invalidates — list, KPIs and the detail. */
const INVALIDATES = [destinationKeys.all, destinationKeys.summary];

export function useCreateDestination() {
  return useMutation<Destination, DestinationInput>({
    mutationFn: (input) => destinationsService.create(input),
    invalidateKeys: INVALIDATES,
  });
}

export function useUpdateDestination() {
  return useMutation<Destination, { id: string; input: DestinationPatch }>({
    mutationFn: ({ id, input }) => destinationsService.update(id, input),
    invalidateKeys: INVALIDATES,
  });
}

/**
 * Move a destination through its lifecycle.
 *
 * Routed through the destination *service* rather than a bare status write, so
 * the legal-transition rules apply here exactly as they would to an API caller.
 */
export function useSetDestinationStatus() {
  return useMutation<Destination, { id: string; status: DestinationStatus }>({
    mutationFn: ({ id, status }) => {
      if (status === "published") return publishDestination(id);
      if (status === "archived") return archiveDestination(id);
      return unpublishDestination(id);
    },
    invalidateKeys: INVALIDATES,
  });
}

export function useDeleteDestination() {
  return useMutation<void, string>({
    mutationFn: (id) => destinationsService.remove(id),
    invalidateKeys: INVALIDATES,
  });
}
