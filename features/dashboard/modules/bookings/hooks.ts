"use client";

import { type ReactNode } from "react";
import { useMutation, useQuery } from "../../data";
import { useResourceList } from "../../crud";
import type { BookingActionId } from "../../domain/lifecycle";
import type {
  Booking,
  BookingActionResult,
  BookingFailureReason,
  RefundQuote,
  RefundReason,
} from "../../domain/types";
import { useDomainActor, useDomainScope } from "../../domain/use-domain";
import { bookingColumns } from "./columns";
import {
  BOOKING_SIDE_EFFECT_KEYS,
  bookingKeys,
  bookingService,
} from "./service";
import type { CreateBookingInput } from "./types";

/** Mutable copy of the shared invalidation list (the hooks API wants an array). */
const SIDE_EFFECTS = BOOKING_SIDE_EFFECT_KEYS.map((k) => [...k]);

/**
 * List bookings with server-side search/sort/pagination.
 *
 * The caller's {@link useDomainScope} is folded in, so a merchant's list request
 * can only ever return their own rows — the filter is applied by the service, not
 * by the table.
 */
export function useBookings(
  rowActions?: (row: Booking) => ReactNode,
  /** Filters the screen is pinned to, e.g. `{ segment: "b2b" }`. */
  initialFilters?: Record<string, string>,
) {
  const scope = useDomainScope();
  return useResourceList<Booking>({
    queryKey: ["bookings", scope.merchantId ?? scope.organizationId ?? "all"],
    fetcher: (params) => bookingService.list(params, scope),
    columns: bookingColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "createdAt", direction: "desc" },
    initialFilters,
    rowActions,
  });
}

/** Fetch a single booking for the detail route. */
export function useBooking(id: string) {
  const scope = useDomainScope();
  return useQuery<Booking>({
    queryKey: bookingKeys.detail(id),
    queryFn: () => bookingService.get(id, scope),
    enabled: Boolean(id),
  });
}

/** Lifecycle counters for KPI tiles and sidebar badges. */
export function useBookingCounts() {
  const scope = useDomainScope();
  return useQuery({
    queryKey: [...bookingKeys.counts(), scope.merchantId ?? "all"],
    queryFn: () => bookingService.counts(scope),
    staleTime: 5_000,
  });
}

export interface TransitionVars {
  id: string;
  actionId: BookingActionId;
  failureReason?: BookingFailureReason;
  note?: string;
  refundReason?: RefundReason;
}

/**
 * Run a lifecycle transition. Invalidates every surface the move can touch —
 * refunds, commission, settlements, notifications and the audit log — because a
 * single transition really does change all of them.
 */
export function useBookingTransition() {
  const actor = useDomainActor();
  const scope = useDomainScope();
  return useMutation<BookingActionResult, TransitionVars>({
    mutationFn: ({ id, actionId, failureReason, note, refundReason }) =>
      bookingService.transition(id, actionId, {
        actor,
        failureReason,
        note,
        refundReason,
        scope,
      }),
    invalidateKeys: SIDE_EFFECTS,
  });
}

/** Quote the refund a cancellation would produce (read-only). */
export function useCancellationQuote(id: string, reason: RefundReason, enabled: boolean) {
  const scope = useDomainScope();
  return useQuery<RefundQuote>({
    queryKey: [...bookingKeys.quote(id), reason],
    queryFn: () => bookingService.quoteCancellation(id, reason, scope),
    enabled: enabled && Boolean(id),
  });
}

/** Create a booking through the domain (central pricing + offer engine). */
export function useCreateBooking() {
  const actor = useDomainActor();
  return useMutation<Booking, CreateBookingInput>({
    mutationFn: (input) => bookingService.create(input, actor),
    invalidateKeys: SIDE_EFFECTS,
  });
}
