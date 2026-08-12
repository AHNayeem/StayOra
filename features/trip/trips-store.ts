"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { TripBooking, TripComponent, TripStatus } from "@/types/trip";
import {
  getRevision,
  getState,
  subscribe as subscribeToDomain,
} from "@/features/dashboard/domain";
import { createCollectionStore } from "@/features/account/collection-store";
import { deriveTripStatus } from "@/services/trip.service";

/**
 * Trips the traveller has booked in this browser.
 *
 * Mirrors `created-bookings` for stays and `bookings-store` for flights: the
 * group record is persisted client-side so My Trips works without a backend.
 *
 * The important detail is what this store does *not* own — component status.
 * Each component's lifecycle lives on its platform booking, so the hooks below
 * re-read status from the domain store on every render. An admin confirming a
 * failed hotel, or the traveller cancelling one leg, is reflected here without
 * this store ever being written to.
 */
const store = createCollectionStore<TripBooking>({
  key: "otithee:trips",
  getId: (trip) => trip.id,
  seed: () => [],
});

/** Persist a freshly-booked trip (newest first). */
export function addTrip(trip: TripBooking): void {
  store.add(trip, true);
}

/** Remove a component from a trip group (after the traveller drops a failure). */
export function removeTripComponent(tripId: string, bookingId: string): void {
  const trip = store.get().find((t) => t.id === tripId);
  if (!trip) return;
  store.update(tripId, {
    components: trip.components.filter((c) => c.bookingId !== bookingId),
  } as Partial<TripBooking>);
}

/** Append a component to an existing trip (adding a booking to a booked trip). */
export function appendTripComponents(tripId: string, components: TripComponent[]): void {
  const trip = store.get().find((t) => t.id === tripId);
  if (!trip) return;
  const ids = new Set(components.map((c) => c.bookingId));
  store.update(tripId, {
    components: [...trip.components.filter((c) => !ids.has(c.bookingId)), ...components],
    totalUsd:
      Math.round(
        ([...trip.components, ...components]
          .filter((c) => c.status !== "failed")
          .reduce((n, c) => n + c.totalUsd, 0)) * 100,
      ) / 100,
  } as Partial<TripBooking>);
}

/** A trip with every component's status refreshed from the platform store. */
function withLiveStatus(trip: TripBooking, revision: number): TripBooking {
  void revision; // the subscription key — see `useSyncExternalStore` below
  const bookings = getState().bookings;
  const components = trip.components.map((component) => {
    const booking = bookings.find((b) => b.id === component.bookingId);
    if (!booking) return component;
    return {
      ...component,
      status: booking.status,
      failureReason: booking.failureReason,
      failureNote: booking.failureNote,
      totalUsd: booking.money.total,
    };
  });
  return {
    ...trip,
    components,
    totalUsd:
      Math.round(
        components.filter((c) => c.status !== "failed").reduce((n, c) => n + c.totalUsd, 0) *
          100,
      ) / 100,
  };
}

/** All booked trips, newest first, with live component statuses. */
export function useTrips(): TripBooking[] {
  const trips = store.useAll();
  const revision = useSyncExternalStore(subscribeToDomain, getRevision, () => 0);
  return useMemo(
    () => trips.map((trip) => withLiveStatus(trip, revision)),
    [trips, revision],
  );
}

/** One trip by id, with live component statuses. */
export function useTrip(id: string): TripBooking | undefined {
  const trips = useTrips();
  return useMemo(() => trips.find((t) => t.id === id), [trips, id]);
}

/** Non-reactive lookup for event handlers. */
export function getTrip(id: string): TripBooking | undefined {
  return store.get().find((t) => t.id === id);
}

/** The roll-up status of a trip — never stored, always derived. */
export function tripStatus(trip: TripBooking): TripStatus {
  return deriveTripStatus(trip.components);
}

/** The trip a given platform booking belongs to, if any. */
export function useTripForBooking(bookingId: string): TripBooking | undefined {
  const trips = useTrips();
  return useMemo(
    () => trips.find((t) => t.components.some((c) => c.bookingId === bookingId)),
    [trips, bookingId],
  );
}
