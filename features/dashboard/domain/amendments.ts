/**
 * Post-booking amendments — the changes a traveller or an agent makes to a
 * booking that already exists.
 *
 * Each one is a real domain operation, not a UI nicety: a date change re-checks
 * inventory and re-prices through the same engine checkout used, an upgrade
 * moves units between room types, and every amendment lands on the booking's
 * timeline and in the audit log. That is what lets the customer screen and the
 * operator screen tell the same story afterwards.
 */

import {
  checkAvailability,
  commitHold,
  holdInventory,
  isPerNight,
  nightsBetween,
  quoteStay,
  releaseForBooking,
  type PropertyRef,
  type RatePlanId,
} from "./inventory";
import { money, priceBooking } from "./money";
import { messagingService } from "./messaging";
import { notify, recordAudit } from "./services";
import { getState, mutate, nextId } from "./store";
import type { Booking, BookingEvent, DomainActor, Traveler } from "./types";

export class AmendmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AmendmentError";
  }
}

function findBooking(id: string): Booking {
  const booking = getState().bookings.find((b) => b.id === id);
  if (!booking) throw new AmendmentError("That booking no longer exists.");
  return booking;
}

/** Statuses an amendment may be applied to. */
const AMENDABLE = new Set(["confirmed", "checked_in", "payment_pending"]);

function assertAmendable(booking: Booking): void {
  if (!AMENDABLE.has(booking.status)) {
    throw new AmendmentError(
      `A ${booking.status.replace(/_/g, " ")} booking can't be changed. Contact support if you need help.`,
    );
  }
}

function event(
  label: string,
  actor: DomainActor,
  note?: string,
  tone: BookingEvent["tone"] = "neutral",
): BookingEvent {
  return {
    id: nextId("ev"),
    at: new Date().toISOString(),
    label,
    note,
    actor: actor.name,
    tone,
  };
}

function commit(
  bookingId: string,
  actor: DomainActor,
  summary: string,
  apply: (booking: Booking) => void,
  timelineLabel: string,
  note?: string,
): Booking {
  const result = mutate((draft) => {
    const booking = draft.bookings.find((b) => b.id === bookingId);
    if (!booking) throw new AmendmentError("That booking no longer exists.");
    apply(booking);
    booking.updatedAt = new Date().toISOString();
    booking.timeline.push(event(timelineLabel, actor, note, "neutral"));
    return structuredClone(booking);
  });

  recordAudit({
    actor,
    action: "update",
    entity: "booking",
    entityId: bookingId,
    entityLabel: result.reference,
    summary,
  });
  return result;
}

// ---------------------------------------------------------------------------
// Travellers
// ---------------------------------------------------------------------------

/** Correct a traveller's name — the commonest post-booking request there is. */
export function correctTravelerName(
  bookingId: string,
  travelerId: string,
  fullName: string,
  actor: DomainActor,
): Booking {
  const trimmed = fullName.trim();
  if (trimmed.length < 2) throw new AmendmentError("Enter the traveller's full name.");
  const booking = findBooking(bookingId);
  const previous = booking.travelers.find((t) => t.id === travelerId)?.fullName ?? "";

  return commit(
    bookingId,
    actor,
    `Corrected traveller name on ${booking.reference}: ${previous} → ${trimmed}`,
    (draft) => {
      const traveler = draft.travelers.find((t) => t.id === travelerId);
      if (!traveler) throw new AmendmentError("That traveller isn't on this booking.");
      traveler.fullName = trimmed;
    },
    "Traveller name corrected",
    `${previous} → ${trimmed}`,
  );
}

/**
 * Add a guest. Occupancy is checked against the room type, because a room that
 * sleeps two does not sleep three just because someone asked.
 */
export function addTraveler(
  bookingId: string,
  traveler: Omit<Traveler, "id">,
  property: PropertyRef | null,
  actor: DomainActor,
): Booking {
  const booking = findBooking(bookingId);
  assertAmendable(booking);

  if (property && booking.stay) {
    const nextGuests = (booking.stay.guests ?? booking.travelers.length) + 1;
    const availability = checkAvailability({
      property,
      roomTypeId: booking.stay.roomTypeId,
      ratePlanId: booking.stay.ratePlanId as RatePlanId,
      checkIn: booking.startAt.slice(0, 10),
      checkOut: booking.endAt.slice(0, 10),
      units: booking.stay.units,
      guests: nextGuests,
    });
    const occupancy = availability.blockers.find((b) => b.code === "occupancy");
    if (occupancy) throw new AmendmentError(occupancy.message);
  }

  return commit(
    bookingId,
    actor,
    `Added traveller ${traveler.fullName} to ${booking.reference}`,
    (draft) => {
      draft.travelers.push({ ...traveler, id: nextId("trv") });
      if (draft.stay) draft.stay.guests = draft.travelers.length;
    },
    "Guest added",
    traveler.fullName,
  );
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

export interface RescheduleQuote {
  available: boolean;
  blockers: { code: string; message: string }[];
  /** New room subtotal for the requested dates. */
  newSubtotal: number;
  currentSubtotal: number;
  /** Positive = the traveller owes more; negative = a credit is due. */
  difference: number;
  nights: number;
  currency: string;
}

/** Price a date change without applying it. */
export function quoteReschedule(
  booking: Booking,
  property: PropertyRef,
  checkIn: string,
  checkOut: string,
): RescheduleQuote {
  if (!booking.stay) {
    return {
      available: false,
      blockers: [{ code: "unsupported", message: "This product can't be rescheduled online." }],
      newSubtotal: 0,
      currentSubtotal: booking.money.base,
      difference: 0,
      nights: 0,
      currency: booking.money.currency,
    };
  }

  const quote = quoteStay({
    property,
    roomTypeId: booking.stay.roomTypeId,
    ratePlanId: booking.stay.ratePlanId as RatePlanId,
    checkIn,
    checkOut,
    units: booking.stay.units,
    guests: booking.stay.guests,
  });

  const addOns = money((booking.addOns ?? []).reduce((sum, a) => sum + a.total, 0));
  const currentSubtotal = money(booking.money.base - addOns);

  return {
    available: quote.available,
    blockers: quote.blockers,
    newSubtotal: quote.roomSubtotal,
    currentSubtotal,
    difference: money(quote.roomSubtotal - currentSubtotal),
    nights: isPerNight(property.vertical) ? nightsBetween(checkIn, checkOut) : 1,
    currency: quote.currency,
  };
}

/**
 * Move a booking to new dates.
 *
 * The old allocation is released and a fresh one taken in the same call, so the
 * booking never holds two sets of nights and never loses its room to someone
 * else mid-change.
 */
export function reschedule(
  bookingId: string,
  property: PropertyRef,
  checkIn: string,
  checkOut: string,
  actor: DomainActor,
): Booking {
  const booking = findBooking(bookingId);
  assertAmendable(booking);
  if (!booking.stay) throw new AmendmentError("This product can't be rescheduled online.");

  const quote = quoteReschedule(booking, property, checkIn, checkOut);
  if (!quote.available) {
    throw new AmendmentError(quote.blockers[0]?.message ?? "Those dates aren't available.");
  }

  const previous = `${booking.startAt.slice(0, 10)} → ${booking.endAt.slice(0, 10)}`;

  // Take the new nights first: if this throws, the original stay is untouched.
  const hold = holdInventory({
    property,
    roomTypeId: booking.stay.roomTypeId,
    ratePlanId: booking.stay.ratePlanId as RatePlanId,
    checkIn,
    checkOut,
    units: booking.stay.units,
    guests: booking.stay.guests,
    lockedTotal: quote.newSubtotal,
  });
  releaseForBooking(bookingId);
  commitHold(hold.id, bookingId);

  const addOns = money((booking.addOns ?? []).reduce((sum, a) => sum + a.total, 0));

  const updated = commit(
    bookingId,
    actor,
    `Rescheduled ${booking.reference}: ${previous} → ${checkIn} → ${checkOut}`,
    (draft) => {
      draft.startAt = new Date(`${checkIn}T14:00:00.000Z`).toISOString();
      draft.endAt = new Date(`${checkOut}T11:00:00.000Z`).toISOString();
      draft.nights = quote.nights;
      draft.holdId = hold.id;
      draft.money = priceBooking({
        base: money(quote.newSubtotal + addOns),
        markup: draft.money.markup,
        discount: draft.money.discount,
        commissionRate: draft.money.commissionRate,
        currency: draft.money.currency,
        refunded: draft.money.refunded,
        commissionReversed: draft.money.commissionReversed,
      });
      draft.payment.amount = draft.money.total;
    },
    "Dates changed",
    `${previous} → ${checkIn} → ${checkOut}`,
  );

  messagingService.send({
    templateKey: "date_change",
    to: { email: updated.customer.email },
    customerEmail: updated.customer.email,
    bookingId: updated.id,
    bookingRef: updated.reference,
    href: `/account/bookings/${updated.id}`,
    context: {
      reference: updated.reference,
      product: updated.productTitle,
      dates: `${checkIn} → ${checkOut}`,
    },
  });
  notify({
    category: "booking",
    audience: ["admin", "merchant"],
    title: "Booking dates changed",
    body: `${updated.reference} moved to ${checkIn} → ${checkOut}`,
    href: `/dashboard/bookings/${updated.id}`,
    tone: "neutral",
    merchantId: updated.merchant.id,
  });

  return updated;
}

// ---------------------------------------------------------------------------
// Upgrades
// ---------------------------------------------------------------------------

export interface UpgradeOption {
  roomTypeId: string;
  roomTypeName: string;
  /** Extra cost versus what they're paying now. */
  difference: number;
  available: boolean;
  reason?: string;
}

/** Upgrade the booking to a different room type on the same rate plan. */
export function upgradeRoom(
  bookingId: string,
  property: PropertyRef,
  roomTypeId: string,
  actor: DomainActor,
): Booking {
  const booking = findBooking(bookingId);
  assertAmendable(booking);
  if (!booking.stay) throw new AmendmentError("This product can't be upgraded online.");

  const checkIn = booking.startAt.slice(0, 10);
  const checkOut = booking.endAt.slice(0, 10);
  const quote = quoteStay({
    property,
    roomTypeId,
    ratePlanId: booking.stay.ratePlanId as RatePlanId,
    checkIn,
    checkOut,
    units: booking.stay.units,
    guests: booking.stay.guests,
  });
  if (!quote.available) {
    throw new AmendmentError(quote.blockers[0]?.message ?? "That room isn't available.");
  }

  const hold = holdInventory({
    property,
    roomTypeId,
    ratePlanId: booking.stay.ratePlanId as RatePlanId,
    checkIn,
    checkOut,
    units: booking.stay.units,
    guests: booking.stay.guests,
    lockedTotal: quote.roomSubtotal,
  });
  releaseForBooking(bookingId);
  commitHold(hold.id, bookingId);

  const addOns = money((booking.addOns ?? []).reduce((sum, a) => sum + a.total, 0));
  const previousRoom = booking.stay.roomTypeName;

  return commit(
    bookingId,
    actor,
    `Upgraded ${booking.reference}: ${previousRoom} → ${quote.roomTypeName}`,
    (draft) => {
      if (!draft.stay) return;
      draft.stay.roomTypeId = roomTypeId;
      draft.stay.roomTypeName = quote.roomTypeName;
      draft.holdId = hold.id;
      draft.money = priceBooking({
        base: money(quote.roomSubtotal + addOns),
        markup: draft.money.markup,
        discount: draft.money.discount,
        commissionRate: draft.money.commissionRate,
        currency: draft.money.currency,
        refunded: draft.money.refunded,
        commissionReversed: draft.money.commissionReversed,
      });
      draft.payment.amount = draft.money.total;
    },
    "Room upgraded",
    `${previousRoom} → ${quote.roomTypeName}`,
  );
}
