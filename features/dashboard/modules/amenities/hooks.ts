"use client";

import { type ReactNode } from "react";
import { useMutation } from "../../data";
import { useResourceList } from "../../crud";
import { amenityColumns } from "./columns";
import { amenityKeys, amenitiesService } from "./service";
import type { AmenityFormValues } from "./schemas";
import type { Amenity } from "./types";

/** List amenities, optionally with a trailing row-actions column. */
export function useAmenities(rowActions?: (row: Amenity) => ReactNode) {
  return useResourceList<Amenity>({
    queryKey: amenityKeys.all,
    fetcher: (params, signal) => amenitiesService.list(params, signal),
    columns: amenityColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "name", direction: "asc" },
    rowActions,
  });
}

export function useCreateAmenity() {
  return useMutation<Amenity, AmenityFormValues>({
    mutationFn: (input) => amenitiesService.create(input),
    invalidateKeys: [amenityKeys.all],
  });
}

export function useUpdateAmenity() {
  return useMutation<Amenity, { id: string; input: AmenityFormValues }>({
    mutationFn: ({ id, input }) => amenitiesService.update(id, input),
    invalidateKeys: [amenityKeys.all],
  });
}

export function useDeleteAmenity() {
  return useMutation<void, string>({
    mutationFn: (id) => amenitiesService.remove(id),
    invalidateKeys: [amenityKeys.all],
  });
}
