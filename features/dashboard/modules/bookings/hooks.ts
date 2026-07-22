"use client";

import { useQuery, useMutation } from "../../data";
import { useResourceList } from "../../crud";
import { bookingColumns } from "./columns";
import { bookingKeys, bookingsService } from "./service";
import type { Booking, CreateBookingInput } from "./types";

/** List bookings with server-side search/sort/pagination + selection. */
export function useBookings() {
  return useResourceList<Booking>({
    queryKey: bookingKeys.all,
    fetcher: (params, signal) => bookingsService.list(params, signal),
    columns: bookingColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "checkIn", direction: "desc" },
  });
}

/** Fetch a single booking for the detail route. */
export function useBooking(id: string) {
  return useQuery<Booking>({
    queryKey: bookingKeys.detail(id),
    queryFn: (signal) => bookingsService.get(id, signal),
    enabled: Boolean(id),
  });
}

/** Create a booking, invalidating the list on success. */
export function useCreateBooking() {
  return useMutation<Booking, CreateBookingInput>({
    mutationFn: (input) => bookingsService.create(input),
    invalidateKeys: [bookingKeys.all],
  });
}

/** Delete a booking (used by the table's bulk action). */
export function useDeleteBooking() {
  return useMutation<void, string>({
    mutationFn: (id) => bookingsService.remove(id),
    invalidateKeys: [bookingKeys.all],
  });
}
