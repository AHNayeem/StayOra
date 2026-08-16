/**
 * Booking tools — availability, pricing, the booking workflow, cancellation.
 *
 * These are the only functions that can move money or inventory, and each one
 * is a thin, typed shell over {@link BookingRepository}. Two rules are enforced
 * here rather than left to the caller's good behaviour:
 *
 *  1. **A quote is never carried forward blind.** `revalidateBooking` re-asks
 *     the platform immediately before confirmation and reports the difference;
 *     `confirmBooking` refuses outright if the total moved under the traveller.
 *  2. **Nothing is confirmed without an agreed total.** The confirmation call
 *     takes the number the traveller said yes to, and the repository compares it
 *     against a fresh quote. A stale price fails loudly instead of charging
 *     quietly.
 */

import type {
  AIAvailabilityResult,
  AIAuthContext,
  AIBookingQuote,
  AIBookingRecord,
  AIBookingRequirement,
  AIBookingSelection,
  AIBookingSession,
  AIBookingSubject,
  AICancellationQuote,
  AIPaymentMethod,
  AIRevalidation,
  AITravelerInfo,
  AITripContext,
} from "@/types/ai";
import type { ListingVertical } from "@/types/booking";
import { getRepositories } from "../repositories";
import type { AIUserProfile, BookingQuoteInput } from "../repositories";
import { stableId } from "../lib/text";
import { requirementsFor } from "../agent/requirements";
import { transition } from "../agent/booking-machine";

/* -------------------------------------------------------------------------- */
/* Availability and pricing                                                    */
/* -------------------------------------------------------------------------- */

export interface AvailabilityInput {
  vertical: ListingVertical;
  slug: string;
  checkIn: string;
  checkOut: string;
  units: number;
  guests: number;
  roomTypeId?: string;
  ratePlanId?: string;
  customerEmail?: string;
  /** Today, ISO `YYYY-MM-DD` — the booking date the quote is made on. */
  today: string;
}

function toQuoteInput(input: AvailabilityInput): BookingQuoteInput {
  return {
    vertical: input.vertical,
    slug: input.slug,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    units: input.units,
    guests: input.guests,
    roomTypeId: input.roomTypeId,
    ratePlanId: input.ratePlanId,
    customerEmail: input.customerEmail,
    bookingDate: input.today,
  };
}

/** checkAvailability — is it bookable on these dates, and at what price. */
export function checkAvailability(input: AvailabilityInput): Promise<AIAvailabilityResult> {
  return getRepositories().bookings.checkAvailability(toQuoteInput(input));
}

/** getPricing — the priced breakdown alone. `undefined` when nothing is sellable. */
export async function getPricing(input: AvailabilityInput): Promise<AIBookingQuote | undefined> {
  const result = await getRepositories().bookings.checkAvailability(toQuoteInput(input));
  return result.quote;
}

/* -------------------------------------------------------------------------- */
/* Starting a booking                                                          */
/* -------------------------------------------------------------------------- */

export interface StartBookingInput {
  subject: AIBookingSubject;
  selection: AIBookingSelection;
  auth?: AIAuthContext;
  context: AITripContext;
  today: string;
  /** ISO timestamp for the session's `updatedAt`. */
  now: string;
}

export interface StartBookingResult {
  session: AIBookingSession;
  availability: AIAvailabilityResult;
}

/**
 * startBooking — open the workflow for a chosen item.
 *
 * Runs the availability + pricing check *first*: an item that can't be booked
 * should never reach a form asking for passport numbers. The returned session is
 * already in the state the answer must render — `collecting_information`,
 * `review`, or one of the failure states.
 */
export async function startBooking(input: StartBookingInput): Promise<StartBookingResult> {
  const { subject, auth } = input;
  let selection = input.selection;

  const ask = (units: number) =>
    checkAvailability({
      vertical: subject.vertical!,
      slug: subject.slug!,
      checkIn: selection.checkIn,
      checkOut: selection.checkOut,
      units,
      guests: selection.guests,
      roomTypeId: selection.roomTypeId,
      ratePlanId: selection.ratePlanId,
      customerEmail: auth?.email,
      today: input.today,
    });

  let availability = await ask(selection.units);

  // The party doesn't fit. The engine has just told us so, and how many units a
  // room sleeps is not something to guess at — so retry once with one unit per
  // guest rather than reporting a dead end the traveller could have fixed by
  // asking for another room.
  const occupancyBlocked = availability.blockers.some((b) => b.code === "occupancy");
  if (occupancyBlocked && selection.units < selection.guests) {
    const retry = await ask(selection.guests);
    if (retry.available) {
      selection = { ...selection, units: selection.guests };
      availability = retry;
    }
  }

  const base: AIBookingSession = {
    id: stableId("bkg", `${subject.id}:${selection.checkIn}:${selection.checkOut}:${selection.guests}`),
    state: "selection",
    subject,
    selection,
    travelers: [],
    requirements: [],
    updatedAt: input.now,
    trail: ["idle"],
  };

  const checked = transition(base, "availability_check", input.now);

  if (!availability.available || !availability.quote) {
    const failed = transition(checked, "availability_failed", input.now);
    return {
      session: {
        ...failed,
        quote: availability.quote,
        failure: {
          code: "availability_lost",
          title:
            availability.status === "booking_restriction"
              ? "Those dates don't meet the rate's rules"
              : "That's no longer available",
          message:
            availability.blockers[0]?.message ??
            "It isn't bookable on those dates any more.",
          recoverable: true,
          retryLabel: "Try different dates",
          details: availability.blockers.map((b) => b.message),
        },
      },
      availability,
    };
  }

  // Pin what was actually priced. From here on every re-check asks about the
  // same room on the same rate plan, so a price movement is a real movement
  // rather than the engine quietly choosing a different room.
  const priced = transition(
    {
      ...checked,
      selection: {
        ...checked.selection,
        roomTypeId: availability.quote.roomTypeId,
        roomTypeName: availability.quote.roomTypeName,
        ratePlanId: availability.quote.ratePlanId,
        ratePlanName: availability.quote.ratePlanName,
      },
      quote: availability.quote,
      originalTotalUsd: availability.quote.totalUsd,
    },
    "pricing_check",
    input.now,
  );

  // Fold in what we already know about the traveller, so nothing is asked twice.
  const savedContact = await getRepositories().account.getSavedContact();

  const contact =
    input.context.contact ??
    (auth?.authenticated && auth.email
      ? { fullName: auth.name ?? "", email: auth.email, phone: auth.phone }
      : (savedContact ?? undefined));

  const withKnown: AIBookingSession = {
    ...priced,
    contact,
    travelers: input.context.travelerDetails ?? [],
    payment: input.context.booking?.payment,
  };

  const requirements = requirementsFor(withKnown, auth);
  const outstanding = requirements.some((r) => r.required && !r.satisfied);

  return {
    session: transition(
      { ...withKnown, requirements },
      outstanding ? "collecting_information" : "review",
      input.now,
    ),
    availability,
  };
}

/* -------------------------------------------------------------------------- */
/* Validation and revalidation                                                 */
/* -------------------------------------------------------------------------- */

export interface ValidateResult {
  ok: boolean;
  requirements: AIBookingRequirement[];
  /** The first unmet requirement — what the agent asks for next. */
  next?: AIBookingRequirement;
}

/**
 * validateBooking — pure completeness and consistency check.
 *
 * Kept separate from `revalidateBooking` on purpose: this asks "have you told me
 * enough?", that one asks "is the world still as we left it?". Conflating them
 * is how prototypes end up charging a stale price to a complete form.
 */
export function validateBooking(
  session: AIBookingSession,
  auth?: AIAuthContext,
): ValidateResult {
  const requirements = requirementsFor(session, auth);
  const next = requirements.find((r) => r.required && !r.satisfied);
  return { ok: !next, requirements, next };
}

/**
 * revalidateBooking — re-ask the platform right before money moves.
 *
 * Deliberately not optimised away when the quote is seconds old: the whole
 * point is that inventory and rates move independently of this conversation,
 * and the only safe assumption is that they have.
 */
export async function revalidateBooking(
  session: AIBookingSession,
  today: string,
  customerEmail?: string,
): Promise<AIRevalidation> {
  const previous = session.quote?.totalUsd ?? 0;
  const result = await checkAvailability({
    vertical: session.subject.vertical!,
    slug: session.subject.slug!,
    checkIn: session.selection.checkIn,
    checkOut: session.selection.checkOut,
    units: session.selection.units,
    guests: session.selection.guests,
    roomTypeId: session.selection.roomTypeId,
    ratePlanId: session.selection.ratePlanId,
    customerEmail,
    today,
  });

  const current = result.quote?.totalUsd ?? 0;
  const moved = Boolean(result.quote) && Math.round(current) !== Math.round(previous);

  return {
    status: !result.available
      ? result.status
      : moved
        ? "price_changed"
        : "available",
    previousTotalUsd: previous,
    currentTotalUsd: current,
    deltaUsd: current - previous,
    blockers: result.blockers,
    quote: result.quote,
  };
}

/* -------------------------------------------------------------------------- */
/* Confirmation                                                                */
/* -------------------------------------------------------------------------- */

export type ConfirmBookingResult =
  | { ok: true; record: AIBookingRecord }
  | {
      ok: false;
      code: "availability_lost" | "price_changed" | "payment_failed" | "booking_failed";
      message: string;
      currentTotalUsd?: number;
      details?: string[];
    };

/**
 * confirmBooking — the only call that creates a booking.
 *
 * Everything it needs is already on the session, which is what makes the
 * guardrail checkable: there is no argument here the agent could improvise, and
 * the total it charges is the total the traveller was shown.
 */
export async function confirmBooking(
  session: AIBookingSession,
  today: string,
): Promise<ConfirmBookingResult> {
  if (!session.quote || !session.contact || !session.payment) {
    return {
      ok: false,
      code: "booking_failed",
      message: "The booking wasn't complete enough to confirm.",
    };
  }

  return getRepositories().bookings.confirm({
    quoteInput: {
      vertical: session.subject.vertical!,
      slug: session.subject.slug!,
      checkIn: session.selection.checkIn,
      checkOut: session.selection.checkOut,
      units: session.selection.units,
      guests: session.selection.guests,
      roomTypeId: session.selection.roomTypeId,
      ratePlanId: session.selection.ratePlanId,
      customerEmail: session.contact.email,
      bookingDate: today,
    },
    selection: session.selection,
    contact: session.contact,
    travelers: session.travelers.length
      ? session.travelers
      : [{ fullName: session.contact.fullName, type: "adult", email: session.contact.email }],
    payment: session.payment,
    specialRequests: session.specialRequests,
    agreedTotalUsd: session.quote.totalUsd,
  });
}

/* -------------------------------------------------------------------------- */
/* Existing bookings                                                           */
/* -------------------------------------------------------------------------- */

export function getBooking(
  idOrReference: string,
  customerEmail?: string,
): Promise<AIBookingRecord | undefined> {
  return getRepositories().bookings.get(idOrReference, customerEmail);
}

/** Bookings this traveller made through the platform, newest first. */
export function listBookingRecords(customerEmail?: string): Promise<AIBookingRecord[]> {
  return getRepositories().bookings.list(customerEmail);
}

export function quoteCancellation(
  idOrReference: string,
  customerEmail?: string,
): Promise<AICancellationQuote | undefined> {
  return getRepositories().bookings.quoteCancellation(idOrReference, customerEmail);
}

export function cancelBooking(idOrReference: string, customerEmail?: string) {
  return getRepositories().bookings.cancel(idOrReference, customerEmail);
}

export function modifyBooking(
  idOrReference: string,
  patch: { checkIn?: string; checkOut?: string; guests?: number; units?: number },
) {
  return getRepositories().bookings.quoteModification(idOrReference, patch);
}

/* -------------------------------------------------------------------------- */
/* Account-backed booking inputs                                               */
/* -------------------------------------------------------------------------- */

export function getPaymentMethods(): Promise<AIPaymentMethod[]> {
  return getRepositories().payments.listMethods();
}

export function getUserProfile(): Promise<AIUserProfile | null> {
  return getRepositories().account.getProfile();
}

export function getSavedTravelers(): Promise<AITravelerInfo[]> {
  return getRepositories().account.getSavedTravelers();
}
