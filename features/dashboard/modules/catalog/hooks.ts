"use client";

import { type ReactNode } from "react";
import { useMutation } from "../../data";
import { useResourceList } from "../../crud";
import { hotelColumns } from "./columns";
import { hotelKeys, hotelsService } from "./service";
import type { HotelFormValues } from "./schemas";
import type { Hotel } from "./types";

/** List hotels, optionally with a trailing row-actions column. */
export function useHotels(rowActions?: (row: Hotel) => ReactNode) {
  return useResourceList<Hotel>({
    queryKey: hotelKeys.all,
    fetcher: (params, signal) => hotelsService.list(params, signal),
    columns: hotelColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "name", direction: "asc" },
    rowActions,
  });
}

export function useCreateHotel() {
  return useMutation<Hotel, HotelFormValues>({
    mutationFn: (input) => hotelsService.create(input),
    invalidateKeys: [hotelKeys.all],
  });
}

export function useUpdateHotel() {
  return useMutation<Hotel, { id: string; input: HotelFormValues }>({
    mutationFn: ({ id, input }) => hotelsService.update(id, input),
    invalidateKeys: [hotelKeys.all],
  });
}

export function useDeleteHotel() {
  return useMutation<void, string>({
    mutationFn: (id) => hotelsService.remove(id),
    invalidateKeys: [hotelKeys.all],
  });
}
