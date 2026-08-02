"use client";

import { useMemo } from "react";
import type { FlightBooking } from "@/types/flight";
import type { CreatedFlightBooking } from "@/services/flight-checkout";
import { addCreatedBooking } from "@/features/account/created-bookings";
import { addNotification } from "@/features/account/notifications-store";
import { createCollectionStore } from "@/features/account/collection-store";
import { airportLabel } from "@/lib/mock/airports";

/**
 * Flight bookings made in this browser.
 *
 * Mirrors `created-bookings` for stays: a freshly-booked flight is persisted
 * client-side and merged over the server dataset, so it appears immediately
 * across My Flights, invoices and payment history without a backend.
 *
 * {@link persistFlightBooking} deliberately writes to *both* stores — the flight
 * record here, and the shared traveller-booking triple into the account store.
 * That single call is what keeps a flight visible in `/account/bookings`,
 * `/account/invoices` and `/account/payments` alongside every other booking.
 */
const store = createCollectionStore<FlightBooking>({
  key: "otithee:flight-bookings",
  getId: (b) => b.id,
  seed: () => [],
});

/**
 * Persist a completed booking everywhere it belongs. Call once, on success.
 *
 * Three writes, one call: the flight record here, the shared booking/invoice/
 * payment triple into the account store, and a notification into the feed. A
 * traveller who books and then opens the bell icon should find their flight
 * there — an empty feed after a successful booking reads as a failure.
 */
export function persistFlightBooking(created: CreatedFlightBooking): void {
  const { flight } = created;

  store.add(flight, true);
  addCreatedBooking({
    booking: created.booking,
    invoice: created.invoice,
    payment: created.payment,
  });

  const first = flight.slices[0];
  const last = flight.slices[flight.slices.length - 1];
  addNotification({
    id: `ntf_${flight.id}`,
    type: "booking",
    title: "Your flight is booked",
    body: `${airportLabel(first.fromCode)} ${flight.tripType === "round-trip" ? "⇄" : "→"} ${airportLabel(last.toCode)} · e-tickets issued. Reference ${flight.reference}, airline PNR ${flight.pnr}.`,
    date: flight.bookedAt,
    read: false,
    href: `/account/flights/${flight.id}`,
  });
}

/** Non-reactive lookup, for event handlers and one-off reads. */
export function getLocalFlightBooking(id: string): FlightBooking | undefined {
  return store.get().find((b) => b.id === id);
}

/** Reactive list of locally-created flight bookings, newest first. */
export const useLocalFlightBookings = store.useAll;

/**
 * Locally-cancelled flight bookings.
 *
 * Kept as a separate id set rather than mutating the booking, because the demo
 * server dataset is shared and immutable from the client — the same override
 * pattern `booking-overrides` uses for stays.
 */
const cancelled = createCollectionStore<{ id: string; cancelledAt: string }>({
  key: "otithee:flight-cancellations",
  getId: (c) => c.id,
  seed: () => [],
});

export function cancelFlightBookingLocal(id: string, nowIso: string): void {
  cancelled.add({ id, cancelledAt: nowIso }, true);
}

export const useCancelledFlightIds = () =>
  cancelled.useAll().map((c) => c.id);

/** Server bookings + locally-created ones, with cancellations applied. */
export function useMergedFlightBookings(server: FlightBooking[]): FlightBooking[] {
  const local = useLocalFlightBookings();
  const cancelledIds = useCancelledFlightIds();

  return useMemo(() => {
    const localIds = new Set(local.map((b) => b.id));
    const merged = [...local, ...server.filter((b) => !localIds.has(b.id))];
    const cancelledSet = new Set(cancelledIds);
    return merged.map((booking) =>
      cancelledSet.has(booking.id)
        ? { ...booking, status: "cancelled" as const }
        : booking,
    );
  }, [server, local, cancelledIds]);
}

/**
 * Resolve one booking, preferring the server record and falling back to a
 * locally-created one, with any local cancellation applied.
 */
export function useResolvedFlightBooking(
  id: string,
  serverBooking: FlightBooking | undefined,
): FlightBooking | undefined {
  const local = useLocalFlightBookings();
  const cancelledIds = useCancelledFlightIds();

  return useMemo(() => {
    const booking = serverBooking ?? local.find((b) => b.id === id);
    if (!booking) return undefined;
    return cancelledIds.includes(id)
      ? { ...booking, status: "cancelled" as const }
      : booking;
  }, [id, serverBooking, local, cancelledIds]);
}
