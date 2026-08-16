/**
 * Waitlist — what a traveller does when the dates they want are sold out.
 *
 * Sold-out used to be a dead end: the availability calendar said no and the
 * journey ended there. A waitlist turns that into recoverable demand, and
 * because inventory here is computed (baseline − consumed), the sweep can tell
 * the moment a cancellation puts units back and write to the traveller with a
 * link straight back to the dates they asked for.
 *
 * Contract mirrors the rest of the domain — `join`, `list`, `cancel`, `sweep` —
 * so a real implementation only replaces the bodies.
 */

import { checkAvailability, findRoomType, type PropertyRef } from "./inventory";
import { send } from "./messaging";
import { notify } from "./service-kit";
import { getState, mutate, nextId } from "./store";
import type { JobOutcome } from "./scheduler";

export type WaitlistStatus = "waiting" | "notified" | "converted" | "cancelled" | "expired";

export interface WaitlistEntry {
  id: string;
  createdAt: string;
  customerEmail: string;
  customerName: string;
  listingSlug: string;
  listingTitle: string;
  vertical: string;
  /**
   * The property snapshot the availability engine needs. Stored on the entry so
   * the sweep can re-check the dates without the catalogue being loaded.
   */
  property: PropertyRef;
  roomTypeId: string;
  roomTypeName: string;
  checkIn: string;
  checkOut: string;
  units: number;
  guests: number;
  status: WaitlistStatus;
  notifiedAt?: string;
  convertedBookingId?: string;
  /** Deep link back to the exact selection. */
  resumeHref: string;
}

export interface JoinWaitlistInput {
  customerEmail: string;
  customerName?: string;
  property: PropertyRef;
  roomTypeId: string;
  roomTypeName?: string;
  checkIn: string;
  checkOut: string;
  units: number;
  guests: number;
}

/** Entries stop being chased once the dates are in the past. */
function isStale(entry: WaitlistEntry, nowMs: number): boolean {
  return new Date(`${entry.checkIn}T00:00:00.000Z`).getTime() < nowMs;
}

function entries(): WaitlistEntry[] {
  return getState().waitlist ?? [];
}

/** Add a traveller to the waitlist. Joining twice is a no-op, not a duplicate. */
export function joinWaitlist(input: JoinWaitlistInput, nowMs = Date.now()): WaitlistEntry {
  const existing = entries().find(
    (e) =>
      e.status === "waiting" &&
      e.customerEmail.toLowerCase() === input.customerEmail.toLowerCase() &&
      e.roomTypeId === input.roomTypeId &&
      e.checkIn === input.checkIn &&
      e.checkOut === input.checkOut,
  );
  if (existing) return existing;

  const entry: WaitlistEntry = {
    id: nextId("wlt"),
    createdAt: new Date(nowMs).toISOString(),
    customerEmail: input.customerEmail,
    customerName: input.customerName ?? "there",
    listingSlug: input.property.slug,
    listingTitle: input.property.title,
    vertical: input.property.vertical,
    property: input.property,
    roomTypeId: input.roomTypeId,
    roomTypeName:
      input.roomTypeName ?? findRoomType(input.property, input.roomTypeId)?.name ?? "Room",
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    units: input.units,
    guests: input.guests,
    status: "waiting",
    resumeHref: `/checkout?v=${input.property.vertical}&slug=${input.property.slug}&in=${input.checkIn}&out=${input.checkOut}&units=${input.units}&room=${input.roomTypeId}`,
  };

  mutate((draft) => {
    draft.waitlist ??= [];
    draft.waitlist.unshift(entry);
  });

  notify({
    category: "booking",
    audience: ["admin", "merchant"],
    title: "Waitlist request",
    body: `${entry.customerName} is waiting on ${entry.roomTypeName} at ${entry.listingTitle} for ${entry.checkIn}.`,
    href: "/dashboard/catalog/rates",
  });

  return entry;
}

/** A traveller's own waitlist. */
export function waitlistFor(email: string): WaitlistEntry[] {
  const key = email.toLowerCase();
  return entries()
    .filter((e) => e.customerEmail.toLowerCase() === key)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function cancelWaitlist(id: string): void {
  mutate((draft) => {
    const entry = draft.waitlist?.find((e) => e.id === id);
    if (entry && (entry.status === "waiting" || entry.status === "notified")) {
      entry.status = "cancelled";
    }
  });
}

/** Close an entry because the traveller booked the dates they waited for. */
export function convertWaitlist(id: string, bookingId: string): void {
  mutate((draft) => {
    const entry = draft.waitlist?.find((e) => e.id === id);
    if (entry) {
      entry.status = "converted";
      entry.convertedBookingId = bookingId;
    }
  });
}

/**
 * The job body: for every waiting entry, ask the inventory engine whether the
 * dates are bookable again and tell the traveller if they are.
 */
export function sweepWaitlist(nowMs = Date.now()): JobOutcome {
  let notified = 0;
  let expired = 0;
  let converted = 0;
  const state = getState();

  for (const entry of entries()) {
    if (entry.status !== "waiting") continue;

    if (isStale(entry, nowMs)) {
      mutate((draft) => {
        const row = draft.waitlist?.find((e) => e.id === entry.id);
        if (row) row.status = "expired";
      });
      expired += 1;
      continue;
    }

    // Did they book it anyway?
    const booking = state.bookings.find(
      (b) =>
        b.customer.email.toLowerCase() === entry.customerEmail.toLowerCase() &&
        b.stay?.roomTypeId === entry.roomTypeId &&
        b.startAt.slice(0, 10) === entry.checkIn &&
        ["confirmed", "checked_in", "completed"].includes(b.status),
    );
    if (booking) {
      convertWaitlist(entry.id, booking.id);
      converted += 1;
      continue;
    }

    const result = checkAvailability({
      property: entry.property,
      roomTypeId: entry.roomTypeId,
      ratePlanId: "standard",
      checkIn: entry.checkIn,
      checkOut: entry.checkOut,
      units: entry.units,
      guests: entry.guests,
    });
    if (!result.available) continue;

    send({
      templateKey: "waitlist_available",
      to: { email: entry.customerEmail },
      customerEmail: entry.customerEmail,
      href: entry.resumeHref,
      nowMs,
      context: {
        name: entry.customerName.split(" ")[0],
        product: entry.listingTitle,
        room: entry.roomTypeName,
        dates: `${entry.checkIn} → ${entry.checkOut}`,
      },
    });
    mutate((draft) => {
      const row = draft.waitlist?.find((e) => e.id === entry.id);
      if (row) {
        row.status = "notified";
        row.notifiedAt = new Date(nowMs).toISOString();
      }
    });
    notified += 1;
  }

  const affected = notified + expired + converted;
  return {
    affected,
    summary: affected
      ? `${notified} notified, ${converted} converted, ${expired} expired`
      : "Nothing available for the waitlist yet",
  };
}

export const waitlistService = {
  join: joinWaitlist,
  forCustomer: waitlistFor,
  all: (): WaitlistEntry[] =>
    [...entries()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  cancel: cancelWaitlist,
  sweep: sweepWaitlist,
  stats() {
    const rows = entries();
    return {
      total: rows.length,
      waiting: rows.filter((e) => e.status === "waiting").length,
      notified: rows.filter((e) => e.status === "notified").length,
      converted: rows.filter((e) => e.status === "converted").length,
    };
  },
};
