"use client";

import { useSyncExternalStore } from "react";
import type { TravelerBooking } from "@/types/traveler";
import { createCollectionStore } from "./collection-store";

/**
 * Booking overrides — client-persisted mutations the traveler makes to bookings
 * that were loaded from the server (today: cancellations). Kept separate from
 * the server dataset and merged on top at render time, so a cancellation sticks
 * across reloads and shows consistently on every page. A real backend would
 * PATCH the booking and drop this store.
 */
const store = createCollectionStore<{ id: string }>({
  key: "stayora:cancelled-bookings",
  getId: (x) => x.id,
  seed: () => [],
});

/** Record a local cancellation. */
export function cancelBookingLocal(id: string): void {
  store.add({ id });
}

/** Reactive set of locally-cancelled booking ids. */
export function useCancelledIds(): Set<string> {
  const list = store.useAll();
  return new Set(list.map((x) => x.id));
}

/** Non-reactive check (for event handlers). */
export function isCancelledLocally(id: string): boolean {
  return store.has(id);
}

/** Reactive membership for one booking. */
export function useIsCancelled(id: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const evt = "stayora:cancelled-bookings:change";
      window.addEventListener(evt, cb);
      window.addEventListener("storage", cb);
      return () => {
        window.removeEventListener(evt, cb);
        window.removeEventListener("storage", cb);
      };
    },
    () => store.has(id),
    () => false,
  );
}

/** Apply local overrides to a booking (pure). */
export function withOverride(
  booking: TravelerBooking,
  cancelledIds: Set<string>,
): TravelerBooking {
  if (cancelledIds.has(booking.id) && booking.status !== "cancelled") {
    return { ...booking, status: "cancelled" };
  }
  return booking;
}
