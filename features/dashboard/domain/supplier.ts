/**
 * Supplier confirmation — the acknowledgement a booking was missing.
 *
 * The prototype confirmed bookings the instant payment captured, which is not
 * how supply works: a property, an airline or a tour operator has to accept the
 * request, and sometimes rejects it. That gap is where real disputes come from,
 * so the lifecycle now records it explicitly:
 *
 *   pending → confirmed  supplier accepted; the booking stands
 *           → rejected   supplier could not honour it; the booking fails and
 *                        any captured payment is refunded
 *
 * Instant-confirmation products (the default for stays with live allotment)
 * skip straight to `confirmed` with a reference. On-request products — venue
 * hire, visas, some tours — sit in `pending` until the `supplier:confirm` job
 * resolves them, which is what makes the "awaiting supplier" state visible in
 * the dashboard and on the traveller's booking.
 *
 * Deterministic on purpose: the outcome is a hash of the booking reference, so
 * a demo behaves the same way every time.
 */

import { hashString } from "@/lib/random";
import { send } from "./messaging";
import { notify } from "./service-kit";
import { getState, mutate } from "./store";
import type { Booking, ProductKind } from "./types";
import type { JobOutcome } from "./scheduler";

export type SupplierStatus = "pending" | "confirmed" | "rejected";

export interface SupplierConfirmation {
  bookingId: string;
  bookingRef: string;
  merchantId: string;
  status: SupplierStatus;
  /** Supplier's own reference — the number a guest quotes at the desk. */
  supplierRef?: string;
  requestedAt: string;
  respondedAt?: string;
  /** Why a request was turned down. */
  reason?: string;
  /** Products that answer immediately never wait for the sweep. */
  instant: boolean;
}

/** Verticals a supplier reviews by hand rather than confirming instantly. */
const ON_REQUEST: ProductKind[] = ["convention-hall", "visa", "tours"];

/** How long a supplier is given before the sweep decides for them. */
const RESPONSE_MINUTES = 20;
/** Share of on-request bookings a supplier turns down, percent. */
const REJECTION_RATE = 12;

function confirmations(): SupplierConfirmation[] {
  return getState().supplierConfirmations ?? [];
}

export function supplierConfirmationFor(bookingId: string): SupplierConfirmation | undefined {
  return confirmations().find((c) => c.bookingId === bookingId);
}

function supplierRef(booking: Booking): string {
  return `SUP-${(hashString(booking.reference) % 900_000) + 100_000}`;
}

/**
 * Request confirmation from the supplier. Called when a booking is created;
 * returns the record so the checkout can tell the traveller what to expect.
 */
export function requestSupplierConfirmation(
  booking: Booking,
  nowMs = Date.now(),
): SupplierConfirmation {
  const existing = supplierConfirmationFor(booking.id);
  if (existing) return existing;

  const instant = !ON_REQUEST.includes(booking.productKind);
  const record: SupplierConfirmation = {
    bookingId: booking.id,
    bookingRef: booking.reference,
    merchantId: booking.merchant.id,
    status: instant ? "confirmed" : "pending",
    supplierRef: instant ? supplierRef(booking) : undefined,
    requestedAt: new Date(nowMs).toISOString(),
    respondedAt: instant ? new Date(nowMs).toISOString() : undefined,
    instant,
  };

  mutate((draft) => {
    draft.supplierConfirmations ??= [];
    draft.supplierConfirmations.unshift(record);
  });

  if (!instant) {
    notify({
      category: "booking",
      audience: ["merchant"],
      tone: "warning",
      title: "Booking awaiting your confirmation",
      body: `${booking.reference} · ${booking.productTitle}. Confirm or decline it from Bookings.`,
      href: `/dashboard/bookings/${booking.id}`,
      merchantId: booking.merchant.id,
    });
  }

  return record;
}

/** Record a supplier's decision — from the sweep, or a merchant clicking. */
export function resolveSupplierConfirmation(
  bookingId: string,
  status: Exclude<SupplierStatus, "pending">,
  options: { reason?: string; nowMs?: number } = {},
): SupplierConfirmation | undefined {
  const { reason, nowMs = Date.now() } = options;
  const booking = getState().bookings.find((b) => b.id === bookingId);
  if (!booking) return undefined;

  const record = mutate((draft) => {
    const row = draft.supplierConfirmations?.find((c) => c.bookingId === bookingId);
    if (!row || row.status !== "pending") return row ? structuredClone(row) : undefined;
    row.status = status;
    row.respondedAt = new Date(nowMs).toISOString();
    if (status === "confirmed") row.supplierRef = supplierRef(booking);
    if (status === "rejected") row.reason = reason ?? "Supplier could not honour the request.";
    return structuredClone(row);
  });
  if (!record || record.status === "pending") return record;

  if (status === "confirmed") {
    send({
      templateKey: "booking_confirmed",
      to: { email: booking.customer.email },
      customerEmail: booking.customer.email,
      bookingId: booking.id,
      bookingRef: booking.reference,
      href: `/account/bookings/${booking.id}`,
      nowMs,
      context: {
        name: booking.customer.name.split(" ")[0],
        product: booking.productTitle,
        reference: booking.reference,
        dates: `${booking.startAt.slice(0, 10)} → ${booking.endAt.slice(0, 10)}`,
        total: `${booking.money.currency} ${booking.money.total.toFixed(2)}`,
      },
    });
  } else {
    notify({
      category: "booking",
      audience: ["admin", "customer"],
      tone: "danger",
      title: "Supplier declined a booking",
      body: `${booking.reference} · ${record.reason}. The customer must be refunded in full.`,
      href: `/dashboard/bookings/${booking.id}`,
      customerId: booking.customer.id,
    });
  }

  return record;
}

/**
 * The job body: decide anything that has been waiting longer than the response
 * window. Deterministic — the same booking always gets the same answer.
 */
export function sweepSupplierConfirmations(nowMs = Date.now()): JobOutcome {
  let confirmed = 0;
  let rejected = 0;

  for (const record of confirmations()) {
    if (record.status !== "pending") continue;
    const waitedMinutes = (nowMs - new Date(record.requestedAt).getTime()) / 60_000;
    if (waitedMinutes < RESPONSE_MINUTES) continue;

    const roll = hashString(`supplier:${record.bookingRef}`) % 100;
    if (roll < REJECTION_RATE) {
      resolveSupplierConfirmation(record.bookingId, "rejected", {
        reason: "The supplier released the allocation before the request arrived.",
        nowMs,
      });
      rejected += 1;
    } else {
      resolveSupplierConfirmation(record.bookingId, "confirmed", { nowMs });
      confirmed += 1;
    }
  }

  const affected = confirmed + rejected;
  return {
    affected,
    summary: affected
      ? `${confirmed} confirmed, ${rejected} declined by the supplier`
      : "No requests waiting on a supplier",
  };
}

export const supplierService = {
  request: requestSupplierConfirmation,
  resolve: resolveSupplierConfirmation,
  get: supplierConfirmationFor,
  all: (): SupplierConfirmation[] => [...confirmations()],
  pending: (): SupplierConfirmation[] =>
    confirmations().filter((c) => c.status === "pending"),
  sweep: sweepSupplierConfirmations,
};
