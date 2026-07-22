"use client";

import { useMemo } from "react";
import type { Invoice, PaymentTxn, TravelerBooking } from "@/types/traveler";
import type { CreatedBooking } from "@/types/traveler";
import { createCollectionStore } from "./collection-store";

/**
 * Created-bookings store — bookings the traveler makes through `/checkout`,
 * persisted client-side and merged on top of the server dataset at render. This
 * is what lets a fresh booking (plus its invoice and payment) appear instantly
 * across `/account/*` without a backend. Mirrors the `booking-overrides`
 * pattern; a real API would return the booking from the server and drop this.
 */
const store = createCollectionStore<CreatedBooking>({
  key: "stayora:created-bookings",
  getId: (c) => c.booking.id,
  seed: () => [],
});

/** Persist a newly-created booking (newest first). */
export function addCreatedBooking(created: CreatedBooking): void {
  store.add(created, true);
}

/** Reactive list of all locally-created booking bundles (newest first). */
export const useCreatedBookings = store.useAll;

/** Non-reactive lookup for event handlers / one-off reads. */
export function getCreatedBooking(id: string): CreatedBooking | undefined {
  return store.get().find((c) => c.booking.id === id);
}

/** Merge created bookings over a server list (created first, deduped by id). */
function merge<T>(server: T[], created: T[], getId: (x: T) => string): T[] {
  const ids = new Set(created.map(getId));
  return [...created, ...server.filter((x) => !ids.has(getId(x)))];
}

/** Server bookings + locally-created ones (reactive). */
export function useMergedBookings(server: TravelerBooking[]): TravelerBooking[] {
  const created = useCreatedBookings();
  return useMemo(
    () => merge(server, created.map((c) => c.booking), (b) => b.id),
    [server, created],
  );
}

/** Server invoices + locally-created ones (reactive). */
export function useMergedInvoices(server: Invoice[]): Invoice[] {
  const created = useCreatedBookings();
  return useMemo(
    () => merge(server, created.map((c) => c.invoice), (i) => i.id),
    [server, created],
  );
}

/** Server payments + locally-created ones (reactive). */
export function useMergedPayments(server: PaymentTxn[]): PaymentTxn[] {
  const created = useCreatedBookings();
  return useMemo(
    () => merge(server, created.map((c) => c.payment), (p) => p.id),
    [server, created],
  );
}

/**
 * Resolve a single booking + its invoice, preferring the server record and
 * falling back to a locally-created one. Returns `undefined` booking when
 * neither source has it (the view renders a not-found state).
 */
export function useResolvedBooking(
  id: string,
  serverBooking: TravelerBooking | undefined,
  serverInvoice: Invoice | undefined,
): { booking: TravelerBooking | undefined; invoice: Invoice | undefined } {
  const created = useCreatedBookings();
  return useMemo(() => {
    if (serverBooking) return { booking: serverBooking, invoice: serverInvoice };
    const local = created.find((c) => c.booking.id === id);
    return { booking: local?.booking, invoice: local?.invoice };
  }, [id, serverBooking, serverInvoice, created]);
}
