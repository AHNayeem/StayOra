/**
 * The booking workflow.
 *
 * This is the part the prototype exists to prove: "book this hotel" starts a
 * real, staged process — availability, price, the details the property needs,
 * an explicit review, a confirmation, and only then a charge — rather than a
 * cheerful sentence claiming a booking exists.
 *
 * Three invariants hold across every handler here:
 *
 *  1. **The traveller confirms a number, and that number is what is charged.**
 *     `confirm` revalidates first and refuses if the total moved.
 *  2. **The agent never fills in a fact it wasn't given.** Names, emails and
 *     payment methods come from the session, the account, or the traveller.
 *  3. **Every state change goes through the machine.** An impossible move
 *     throws in development instead of quietly skipping a safety step.
 */

import type {
  AIAvailabilityResult,
  AIBlock,
  AIBookingSession,
  AIBookingSubject,
  AIListingRef,
  AISelectionRef,
  AITravelerInfo,
  AITripContext,
} from "@/types/ai";
import type { Listing } from "@/types/catalog";
import { listingHref } from "@/constants/verticals";
import { addDays } from "@/lib/flight-time";
import { usd } from "../../lib/money";
import { extractTravelerNames } from "../../nlu/contact";
import { BOOKING_STATE_LABEL, canTransition, transition } from "../booking-machine";
import { describeOptions, resolveReference } from "../reference";
import { firstOutstanding, requirementsFor, travelersNeeded } from "../requirements";
import type { ActionContext, ActionResult } from "../shared";
import { DEFAULT_LEAD_DAYS, listingResultSet, partyOf, partySize, placeOf, rememberResults } from "../shared";

/* -------------------------------------------------------------------------- */
/* Selection                                                                   */
/* -------------------------------------------------------------------------- */

/** Resolve what the traveller is pointing at, from an action or the message. */
export function resolveSubjectRef(ctx: ActionContext): {
  ref?: AISelectionRef;
  problem?: ActionResult;
} {
  const { context, parsed, request } = ctx;

  const explicit =
    request.action?.kind === "start-booking" || request.action?.kind === "select"
      ? request.action.ref
      : undefined;
  if (explicit) return { ref: explicit };

  const resolved = resolveReference(parsed.reference, context);
  if (resolved.ref) return { ref: resolved.ref };

  // The page the traveller is reading is a perfectly good referent.
  if (request.page?.listing) {
    return {
      ref: {
        kind: "listing",
        id: request.page.listing.slug,
        title: request.page.listing.title,
        vertical: request.page.listing.vertical,
        slug: request.page.listing.slug,
      },
    };
  }

  if (context.selection) return { ref: context.selection };

  const single = context.lastResults?.items;
  if (single?.length === 1) {
    return {
      ref: {
        kind: single[0].kind,
        id: single[0].id,
        title: single[0].title,
        vertical: single[0].vertical,
        slug: single[0].slug,
      },
    };
  }

  const options = describeOptions(context.lastResults);
  return {
    problem: {
      text: options.length
        ? "Which one would you like? Tell me the number and I'll take it from there."
        : "Which one would you like to book? Ask me to find something first, or open a listing and I'll pick it up from there.",
      blocks: options.length
        ? [
            {
              kind: "clarification",
              question: "Which option should I book?",
              options,
            },
          ]
        : [],
      suggestions: options.length
        ? options.slice(0, 3).map((label) => `Book ${label.replace(/^\d+\.\s*/, "")}`)
        : [
            context.destination ? `Find hotels in ${context.destination}` : "Find a family hotel",
            "Plan my next trip",
          ],
      contextPatch: context,
    },
  };
}

/**
 * "The second one" — show what it is and whether it's actually bookable.
 *
 * A selection deliberately stops short of the booking workflow: it answers
 * "what am I looking at, and can I have it?" so the traveller can decide before
 * being asked for a passport number.
 */
export async function selectItem(ctx: ActionContext, ref: AISelectionRef): Promise<ActionResult> {
  const { context } = ctx;
  if (ref.kind === "flight" || !ref.vertical || !ref.slug) {
    return {
      text: `${ref.title} it is. Say “book it” and I'll start the booking.`,
      blocks: [],
      suggestions: ["Book it", "Compare these flights", "Show me something cheaper"],
      contextPatch: { ...context, selection: ref },
    };
  }

  const [listing] = await ctx.tools.call("resolveListings", [[ref.id]]);
  const selection = defaultSelection(context, ctx.today);
  const availability = await ctx.tools.call("checkAvailability", [
    {
      vertical: ref.vertical,
      slug: ref.slug,
      checkIn: selection.checkIn,
      checkOut: selection.checkOut,
      units: selection.units,
      guests: selection.guests,
      customerEmail: ctx.auth?.email,
      today: ctx.today,
    },
  ]);

  const quote = availability.quote;
  const text = !availability.available
    ? `${ref.title} isn't bookable for ${selection.checkIn} → ${selection.checkOut}: ${availability.blockers[0]?.message ?? "no availability."}`
    : `${ref.title} — ${usd(quote!.totalUsd)} all in for ${selection.nights} night${selection.nights === 1 ? "" : "s"}, ${selection.guests} guest${selection.guests === 1 ? "" : "s"}. ${quote!.cancellationPolicy} Shall I book it?`;

  const blocks: AIBlock[] = [];
  if (listing) {
    blocks.push({
      kind: "listings",
      title: "Your selection",
      vertical: listing.vertical,
      items: [{ listing, href: listingHref(listing), reason: quote ? `${usd(quote.perNightUsd ?? quote.totalUsd)} a night · ${quote.unitsLeft} left` : undefined }],
    });
  }
  if (!availability.available) {
    blocks.push({
      kind: "notice",
      tone: "warning",
      text: availability.blockers.map((b) => b.message).join(" "),
    });
  }

  return {
    text,
    blocks,
    suggestions: availability.available
      ? ["Book it", "Change the dates", "Summarize the reviews", "Compare with the others"]
      : ["Try different dates", "Show me alternatives"],
    contextPatch: { ...context, selection: ref },
  };
}

/* -------------------------------------------------------------------------- */
/* Starting the workflow                                                       */
/* -------------------------------------------------------------------------- */

/** Dates, party and units to book, from what the conversation established. */
function defaultSelection(context: AITripContext, today: string) {
  const nights = Math.max(1, context.nights ?? 2);
  const checkIn = context.startDate ?? addDays(today, DEFAULT_LEAD_DAYS);
  const checkOut = context.endDate ?? addDays(checkIn, nights);
  const guests = partySize(partyOf(context));
  return {
    checkIn,
    checkOut,
    nights,
    guests,
    units: Math.max(1, context.rooms ?? Math.ceil(guests / 2)),
  };
}

function toSubject(listing: Listing): AIBookingSubject {
  return {
    kind: "listing",
    id: listing.id,
    title: listing.title,
    href: listingHref(listing),
    image: listing.image,
    location: listing.location.label,
    vertical: listing.vertical,
    slug: listing.slug,
  };
}

export async function startBooking(
  ctx: ActionContext,
  ref: AISelectionRef,
): Promise<ActionResult> {
  const { context } = ctx;

  if (ref.kind === "flight") {
    return {
      text: "Flight bookings still go through the fare page so you can pick seats and baggage — I've kept your selection. Everything else I can book right here.",
      blocks: [
        {
          kind: "action-required",
          title: "Continue on the fare page",
          text: "Fares are held at the airline, so the last step happens there.",
          href: `/flights/${encodeURIComponent(ref.id)}`,
          actionLabel: "Open the fare",
          tone: "info",
        },
      ],
      suggestions: ["Find a hotel there", "Compare these flights"],
      contextPatch: { ...context, selection: ref },
    };
  }

  const [listing] = await ctx.tools.call("resolveListings", [[ref.id]]);
  if (!listing) {
    return {
      text: "I couldn't load that listing to start a booking. Try opening it directly and I'll pick it up from the page.",
      blocks: [],
      suggestions: ["Show me other options"],
      contextPatch: context,
    };
  }

  const selection = defaultSelection(context, ctx.today);
  const { session } = await ctx.tools.call("startBooking", [
    {
      subject: toSubject(listing),
      selection: { ...selection },
      auth: ctx.auth,
      context,
      today: ctx.today,
      now: ctx.now,
    },
  ]);

  return renderBookingState(ctx, session, {
    lead: `${listing.title} — let's get this booked.`,
    steps: [
      { label: "Checking availability", status: session.quote ? "done" : "failed", detail: session.quote ? `${session.quote.unitsLeft} left` : undefined },
      {
        label: "Checking the latest price",
        status: session.quote ? "done" : "pending",
        detail: session.quote ? usd(session.quote.totalUsd) : undefined,
      },
    ],
  });
}

/**
 * Move a session to whichever step its requirements say comes next.
 *
 * Returns it untouched when that move is illegal — a booking that already
 * failed on availability must not quietly accept a card and pretend to be back
 * on track. {@link renderBookingState} then shows the failure instead.
 */
function advance(session: AIBookingSession, at: string): AIBookingSession {
  const target = firstOutstanding(session.requirements) ? "collecting_information" : "review";
  if (session.state === target || canTransition(session.state, target)) {
    return transition(session, target, at);
  }
  return session;
}

/* -------------------------------------------------------------------------- */
/* Collecting what's missing                                                   */
/* -------------------------------------------------------------------------- */

export async function collectBookingInfo(ctx: ActionContext): Promise<ActionResult> {
  const { context, request, parsed } = ctx;
  const session = context.booking;
  if (!session) {
    return {
      text: "There's no booking in progress. Pick something and say “book it” and I'll start one.",
      blocks: [],
      suggestions: ["Find a family hotel", "Plan my next trip"],
      contextPatch: context,
    };
  }

  const provided = request.action?.kind === "provide-info" ? request.action : undefined;

  // Contact: a structured form submission wins, then anything stated in prose.
  const contact = provided?.contact ?? mergeContactFromText(session, parsed.contact);
  const travelers = provided?.travelers ?? travelersFromText(session, ctx);
  const specialRequests = provided?.specialRequests ?? session.specialRequests;

  const updated: AIBookingSession = {
    ...session,
    contact: contact ?? session.contact,
    travelers: travelers.length ? travelers : session.travelers,
    specialRequests,
  };
  updated.requirements = requirementsFor(updated, ctx.auth);

  return renderBookingState(ctx, advance(updated, ctx.now), {
    lead: contact?.fullName ? `Thanks, ${contact.fullName.split(" ")[0]}.` : "Got it.",
  });
}

/** Contact facts from the message, folded over what we already had. */
function mergeContactFromText(
  session: AIBookingSession,
  extracted: { fullName?: string; email?: string; phone?: string },
) {
  if (!extracted.fullName && !extracted.email && !extracted.phone) return session.contact;
  return {
    fullName: extracted.fullName ?? session.contact?.fullName ?? "",
    email: extracted.email ?? session.contact?.email ?? "",
    phone: extracted.phone ?? session.contact?.phone,
    countryCode: session.contact?.countryCode,
  };
}

/** Guest names listed in prose, when the booking needs more than one. */
function travelersFromText(session: AIBookingSession, ctx: ActionContext): AITravelerInfo[] {
  const needed = travelersNeeded(session);
  if (needed <= 1) return session.travelers;
  const names = extractTravelerNames(ctx.request.message);
  if (names.length < 2) return session.travelers;
  return names.slice(0, needed).map((fullName, index) => ({
    fullName,
    type: "adult" as const,
    email: index === 0 ? session.contact?.email : undefined,
  }));
}

/* -------------------------------------------------------------------------- */
/* Payment                                                                     */
/* -------------------------------------------------------------------------- */

export async function selectPayment(
  ctx: ActionContext,
  methodId?: string,
): Promise<ActionResult> {
  const { context } = ctx;
  const session = context.booking;
  if (!session) {
    return {
      text: "There's no booking waiting on a payment method right now.",
      blocks: [],
      suggestions: ["Find a family hotel"],
      contextPatch: context,
    };
  }

  const methods = await ctx.tools.call("getPaymentMethods", []);
  const chosen = methods.find((m) => m.id === methodId);

  if (!chosen) {
    return {
      text: "Which card should I charge? Nothing is taken until you confirm the review.",
      blocks: [
        {
          kind: "payment-selection",
          title: "Choose a payment method",
          methods,
          amountUsd: session.quote?.totalUsd ?? 0,
        },
      ],
      suggestions: [],
      contextPatch: context,
    };
  }

  const updated: AIBookingSession = {
    ...session,
    payment: {
      methodId: chosen.id,
      label: chosen.label,
      brand: chosen.brand,
      last4: chosen.last4,
    },
  };
  updated.requirements = requirementsFor(updated, ctx.auth);

  return renderBookingState(ctx, advance(updated, ctx.now), {
    lead: `${chosen.label} it is.`,
  });
}

/* -------------------------------------------------------------------------- */
/* Review and confirmation                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The review step.
 *
 * Revalidates before showing the summary, so the number the traveller is asked
 * to approve is current rather than whatever was true when they started typing.
 */
export async function requestConfirmation(ctx: ActionContext): Promise<ActionResult> {
  const { context } = ctx;
  const session = context.booking;
  if (!session) {
    return {
      text: "There's no booking to review yet.",
      blocks: [],
      suggestions: ["Find a family hotel"],
      contextPatch: context,
    };
  }

  const revalidation = await ctx.tools.call("revalidateBooking", [
    session,
    ctx.today,
    ctx.auth?.email,
  ]);

  if (revalidation.status === "no_longer_available" || revalidation.status === "booking_restriction") {
    return renderAvailabilityLoss(ctx, session, revalidation.blockers);
  }

  const refreshed: AIBookingSession = {
    ...session,
    quote: revalidation.quote ?? session.quote,
  };

  if (revalidation.status === "price_changed") {
    const moved = transition(refreshed, "price_changed", ctx.now);
    return {
      text: `Before I take payment — the price moved from ${usd(revalidation.previousTotalUsd)} to ${usd(revalidation.currentTotalUsd)} since I quoted you. I won't book it until you're happy with the new total.`,
      blocks: [{ kind: "price-change", revalidation, session: moved }],
      suggestions: ["Yes, book it at the new price", "Show me cheaper options", "Cancel the booking"],
      contextPatch: { ...context, booking: moved },
      steps: [
        { label: "Re-checking availability", status: "done" },
        { label: "Re-checking the price", status: "failed", detail: "changed" },
      ],
    };
  }

  const awaiting = transition(
    transitionToReview(refreshed, ctx.now),
    "awaiting_confirmation",
    ctx.now,
  );

  return {
    text: `Here's everything before I book it. Nothing has been charged yet — say “confirm” and I'll take ${usd(awaiting.quote!.totalUsd)} and issue your confirmation.`,
    blocks: [{ kind: "booking-review", session: awaiting, confirmLabel: "Confirm booking" }],
    suggestions: ["Confirm booking", "Change the dates", "Use a different card", "Cancel"],
    contextPatch: { ...context, booking: awaiting },
    steps: [
      { label: "Re-checking availability", status: "done", detail: `${awaiting.quote!.unitsLeft} left` },
      { label: "Re-checking the price", status: "done", detail: "unchanged" },
      { label: "Awaiting your confirmation", status: "active" },
    ],
  };
}

/** Nudge a session into `review` from wherever it legally can. */
function transitionToReview(session: AIBookingSession, at: string): AIBookingSession {
  if (session.state === "review" || session.state === "awaiting_confirmation") return session;
  return transition(session, "review", at);
}

/**
 * The confirmation.
 *
 * The order here is the whole safety argument: revalidate, then charge, then
 * create. Anything that fails on the way out leaves the traveller in a state
 * they can act on, and never in one where money moved without a booking.
 */
export async function confirmBooking(ctx: ActionContext): Promise<ActionResult> {
  const { context } = ctx;
  const session = context.booking;

  if (!session) {
    return {
      text: "There's no booking waiting for confirmation. Tell me what to book and I'll set it up.",
      blocks: [],
      suggestions: ["Find a family hotel", "Plan my next trip"],
      contextPatch: context,
    };
  }

  // A "yes" against an incomplete booking means "carry on", not "charge me".
  const validation = await ctx.tools.call("validateBooking", [session, ctx.auth]);
  if (!validation.ok) {
    const updated = { ...session, requirements: validation.requirements };
    return renderBookingState(ctx, transition(updated, "collecting_information", ctx.now), {
      lead: "Almost — one thing first.",
    });
  }

  // Anything not yet reviewed goes to the review step rather than straight to a
  // charge: an explicit confirmation has to be of a *shown* total.
  if (session.state !== "awaiting_confirmation" && session.state !== "price_changed") {
    return requestConfirmation(ctx);
  }

  const revalidation = await ctx.tools.call("revalidateBooking", [
    session,
    ctx.today,
    ctx.auth?.email,
  ]);

  if (revalidation.status === "no_longer_available" || revalidation.status === "booking_restriction") {
    return renderAvailabilityLoss(ctx, session, revalidation.blockers);
  }

  // The traveller confirmed a number. If it moved between the review and this
  // click, that confirmation no longer covers what we'd charge.
  if (revalidation.status === "price_changed" && session.state !== "price_changed") {
    const moved = transition({ ...session, quote: revalidation.quote }, "price_changed", ctx.now);
    return {
      text: `Stopping there — the total changed from ${usd(revalidation.previousTotalUsd)} to ${usd(revalidation.currentTotalUsd)} in the last moment. Confirm again and I'll book it at the new price.`,
      blocks: [{ kind: "price-change", revalidation, session: moved }],
      suggestions: ["Yes, book it at the new price", "Show me cheaper options", "Cancel the booking"],
      contextPatch: { ...context, booking: moved },
    };
  }

  const agreed: AIBookingSession = {
    ...session,
    quote: revalidation.quote ?? session.quote,
  };
  const processing = transition(
    agreed.state === "price_changed"
      ? transition(agreed, "awaiting_confirmation", ctx.now)
      : agreed,
    "processing",
    ctx.now,
  );

  const result = await ctx.tools.call("confirmBooking", [processing, ctx.today]);

  if (!result.ok) {
    const failedState =
      result.code === "payment_failed"
        ? ("payment_failed" as const)
        : result.code === "availability_lost"
          ? ("availability_failed" as const)
          : result.code === "price_changed"
            ? ("price_changed" as const)
            : ("booking_failed" as const);

    const failed = transition(
      {
        ...processing,
        failure: {
          code: result.code === "availability_lost" ? "availability_lost" : result.code,
          title:
            result.code === "payment_failed"
              ? "The payment was declined"
              : result.code === "availability_lost"
                ? "It went while we were talking"
                : "The booking didn't go through",
          message: result.message,
          recoverable: true,
          retryLabel: result.code === "payment_failed" ? "Try another card" : "Try again",
          details: result.details,
        },
      },
      failedState,
      ctx.now,
    );

    return {
      text:
        result.code === "payment_failed"
          ? `${result.message} Nothing has been charged and your dates aren't held — pick another card and I'll try again.`
          : `${result.message} Nothing has been charged.`,
      blocks: [{ kind: "booking-error", failure: failed.failure!, session: failed }],
      suggestions:
        result.code === "payment_failed"
          ? ["Use a different card", "Cancel the booking"]
          : ["Try different dates", "Show me alternatives"],
      contextPatch: { ...context, booking: failed },
      steps: [
        { label: "Re-checking availability", status: "done" },
        { label: "Taking payment", status: result.code === "payment_failed" ? "failed" : "done" },
        { label: "Creating your booking", status: "failed" },
      ],
    };
  }

  const confirmed = transition({ ...processing, bookingId: result.record.id, reference: result.record.reference }, "confirmed", ctx.now);

  return {
    text: `Booked. Your reference is ${result.record.reference} and the confirmation is on its way to ${confirmed.contact!.email}. ${confirmed.quote!.cancellationPolicy}`,
    blocks: [
      {
        kind: "booking-confirmation",
        session: confirmed,
        manageHref: result.record.href,
      },
    ],
    suggestions: [
      `Things to do in ${confirmed.subject.location?.split(",")[0] ?? "the area"}`,
      "Show my bookings",
      `Cancel ${result.record.reference}`,
    ],
    contextPatch: {
      ...context,
      // The workflow is finished: clear it so the next "book it" starts clean,
      // but keep the details so the traveller isn't asked for them again.
      booking: undefined,
      contact: confirmed.contact,
      travelerDetails: confirmed.travelers,
      recentBookingIds: [result.record.reference, ...(context.recentBookingIds ?? [])].slice(0, 5),
    },
    steps: [
      { label: "Re-checking availability", status: "done" },
      { label: "Re-checking the price", status: "done" },
      { label: "Taking payment", status: "done", detail: usd(confirmed.quote!.totalUsd) },
      { label: "Creating your booking", status: "done", detail: result.record.reference },
    ],
  };
}

/** "Never mind" — drop the workflow without touching anything real. */
export function abandonBooking(ctx: ActionContext): ActionResult {
  const { context } = ctx;
  const session = context.booking;
  return {
    text: session
      ? `Stopped — nothing was charged and ${session.subject.title} isn't booked. Say the word and we'll pick it back up.`
      : "Nothing was in progress, so there's nothing to stop.",
    blocks: [],
    suggestions: ["Show me cheaper options", "Find something else", "Plan my next trip"],
    contextPatch: { ...context, booking: undefined },
  };
}

/* -------------------------------------------------------------------------- */
/* Cancellation and modification of existing bookings                          */
/* -------------------------------------------------------------------------- */

export async function cancelExistingBooking(
  ctx: ActionContext,
  idOrReference: string,
  confirmed: boolean,
): Promise<ActionResult> {
  const { context } = ctx;
  const record = await ctx.tools.call("getBooking", [idOrReference, ctx.auth?.email]);

  if (!record) {
    return {
      text: `I couldn't find a booking matching “${idOrReference}”. Your references look like SO-XXXXXX and live under Account → Bookings.`,
      blocks: [],
      suggestions: ["Show my bookings"],
      contextPatch: context,
    };
  }

  const quote = await ctx.tools.call("quoteCancellation", [record.id, ctx.auth?.email]);

  // Cancellation is destructive, so the price of it is shown *before* it is
  // done, and the tool layer refuses to run without an explicit confirmation.
  if (!confirmed) {
    return {
      text: quote
        ? `Cancelling ${record.reference} would refund ${usd(quote.refundUsd)}${quote.feeUsd > 0 ? ` after a ${usd(quote.feeUsd)} cancellation fee` : ""}. ${quote.policy} Confirm and I'll cancel it.`
        : `I can cancel ${record.reference}, but I couldn't price the refund. Open the booking to see the exact terms.`,
      blocks: quote ? [{ kind: "cancellation", quote, booking: record }] : [],
      suggestions: [`Yes, cancel ${record.reference}`, "Keep the booking", "Show my bookings"],
      contextPatch: {
        ...context,
        recentBookingIds: [record.reference, ...(context.recentBookingIds ?? [])].slice(0, 5),
      },
    };
  }

  const result = await ctx.tools.call("cancelBooking", [record.id, ctx.auth?.email], {
    confirmed: true,
  });

  if (!result.ok) {
    return {
      text: result.message,
      blocks: result.href
        ? [
            {
              kind: "action-required",
              title: "Cancel it from the booking page",
              text: "The booking page has the exact refund and the cancel button.",
              href: result.href,
              actionLabel: "Open the booking",
              tone: "warning",
            },
          ]
        : [],
      suggestions: ["Show my bookings"],
      contextPatch: context,
    };
  }

  return {
    text: `${record.reference} is cancelled. ${result.quote.refundUsd > 0 ? `${usd(result.quote.refundUsd)} will be refunded to your original payment method.` : "No refund is due under this booking's policy."}`,
    blocks: [{ kind: "cancellation", quote: result.quote, booking: { ...record, status: "cancelled" } }],
    suggestions: ["Show my bookings", "Plan another trip"],
    contextPatch: context,
    steps: [
      { label: "Checking the cancellation policy", status: "done" },
      { label: "Cancelling the booking", status: "done", detail: record.reference },
      { label: "Raising the refund", status: "done", detail: usd(result.quote.refundUsd) },
    ],
  };
}

export async function modifyExistingBooking(
  ctx: ActionContext,
  idOrReference: string,
  patch: { checkIn?: string; checkOut?: string; guests?: number; units?: number },
): Promise<ActionResult> {
  const { context } = ctx;
  const record = await ctx.tools.call("getBooking", [idOrReference, ctx.auth?.email]);
  if (!record) {
    return {
      text: `I couldn't find “${idOrReference}” on this account. Give me the reference and I'll re-price the change.`,
      blocks: [],
      suggestions: ["Show my bookings"],
      contextPatch: context,
    };
  }

  const result = await ctx.tools.call("modifyBooking", [record.id, patch]);
  if (!result.ok) {
    return {
      text: result.message,
      blocks: [],
      suggestions: ["Show my bookings"],
      contextPatch: context,
    };
  }

  const difference = result.newTotalUsd - result.currentTotalUsd;
  return {
    text: result.available
      ? `${record.reference} on those dates would be ${usd(result.newTotalUsd)} instead of ${usd(result.currentTotalUsd)} — ${
          difference === 0
            ? "no change to what you pay"
            : difference > 0
              ? `${usd(difference)} more`
              : `${usd(-difference)} less`
        }. ${result.message} Changes are applied on the booking page so you see the final terms.`
      : `Those dates aren't available for ${record.reference}: ${result.message}`,
    blocks: [
      {
        kind: "action-required",
        title: "Make the change on your booking",
        text: "Date and guest changes are applied on the booking page, where the new terms are shown before anything is committed.",
        href: record.href,
        actionLabel: "Open the booking",
        tone: "info",
      },
    ],
    suggestions: ["Show my bookings", `Cancel ${record.reference}`],
    contextPatch: context,
  };
}

/* -------------------------------------------------------------------------- */
/* Rendering the workflow                                                      */
/* -------------------------------------------------------------------------- */

/** The item is gone — say so, and go find real alternatives. */
async function renderAvailabilityLoss(
  ctx: ActionContext,
  session: AIBookingSession,
  blockers: Array<{ code: string; message: string }>,
): Promise<ActionResult> {
  const { context } = ctx;
  const place = placeOf(context);
  const alternatives = await ctx.tools.call("searchHotels", [
    {
      place,
      maxNightlyUsd: session.quote?.perNightUsd,
      nights: session.selection.nights,
      limit: 3,
    },
  ]);
  const others = alternatives.items.filter((item) => item.listing.id !== session.subject.id);

  const failed = transition(
    {
      ...session,
      failure: {
        code: "availability_lost",
        title: "That's no longer available",
        message: blockers[0]?.message ?? "It sold out while we were talking.",
        recoverable: true,
        retryLabel: "Try different dates",
        details: blockers.map((b) => b.message),
      },
    },
    "availability_failed",
    ctx.now,
  );

  const patch = rememberResults(
    { ...context, booking: failed },
    listingResultSet(others as AIListingRef[], "search-hotels"),
  );

  return {
    // Phrased for both cases this renders: an item that was never bookable on
    // these terms, and one that went while we were talking.
    text: `I can't book ${session.subject.title} as it stands — ${blockers[0]?.message ?? "it sold out."} Nothing was charged.${others.length ? " Here's what else is available on the same dates." : ""}`,
    blocks: [
      {
        kind: "availability-change",
        result: { status: "no_longer_available", available: false, unitsLeft: 0, blockers } as AIAvailabilityResult,
        session: failed,
        alternatives: others as AIListingRef[],
      },
    ],
    suggestions: others.length
      ? [`Book ${others[0].listing.title}`, "Try different dates", "Show me more options"]
      : ["Try different dates", "Find something else"],
    contextPatch: patch,
    steps: [
      { label: "Re-checking availability", status: "failed" },
      { label: "Finding alternatives", status: "done", detail: `${others.length} found` },
    ],
  };
}

/**
 * Turn a session into the answer for whatever state it is in.
 *
 * One function owns this mapping so the workflow can't grow two different
 * renderings of "we still need your passport number".
 */
export async function renderBookingState(
  ctx: ActionContext,
  session: AIBookingSession,
  options: { lead?: string; steps?: ActionResult["steps"] } = {},
): Promise<ActionResult> {
  const { context } = ctx;
  const patch = { ...context, booking: session, selection: context.selection };
  const lead = options.lead ? `${options.lead} ` : "";

  if (session.state === "availability_failed") {
    return renderAvailabilityLoss(
      ctx,
      session,
      session.failure?.details?.map((message) => ({ code: "sold_out", message })) ?? [],
    );
  }

  // A booking that failed on payment or creation stays failed until the
  // traveller decides what to do — collecting more details would imply progress
  // that isn't happening.
  if (session.failure && (session.state === "payment_failed" || session.state === "booking_failed")) {
    return {
      text: `${lead}${session.failure.message}`,
      blocks: [{ kind: "booking-error", failure: session.failure, session }],
      suggestions: ["Use a different card", "Try different dates", "Stop this booking"],
      contextPatch: patch,
      steps: options.steps,
    };
  }

  const outstanding = firstOutstanding(session.requirements);

  if (outstanding?.key === "authentication") {
    // Signing in is the route to a booking *I* can make. It isn't the only route
    // to a booking: the site takes guest checkouts, so the prepared draft goes
    // out alongside — offering only the wall would be a worse product than the
    // one this assistant sits on top of.
    const draft =
      session.subject.vertical && session.subject.slug
        ? await ctx.tools.call("createBookingDraft", [
            {
              vertical: session.subject.vertical,
              slug: session.subject.slug,
              checkIn: session.selection.checkIn,
              checkOut: session.selection.checkOut,
              guests: session.selection.guests,
              rooms: session.selection.units,
              nights: session.selection.nights,
              today: ctx.today,
            },
          ])
        : undefined;

    return {
      text: `${lead}${session.quote ? `It's available at ${usd(session.quote.totalUsd)} for your dates. ` : ""}To book it for you I need you signed in — your confirmation and invoice have to belong to an account. You can also take it through the normal checkout as a guest.`,
      blocks: [
        {
          kind: "action-required",
          title: "Sign in and I'll book it",
          text: "I'll keep this booking exactly as it is and pick it straight back up.",
          href: "/login",
          actionLabel: "Sign in",
          tone: "info",
        },
        ...(draft ? [{ kind: "booking-draft" as const, draft }] : []),
        progressBlock(session),
      ],
      suggestions: ["Show me the price breakdown", "Compare with other options"],
      contextPatch: patch,
      steps: options.steps,
    };
  }

  if (outstanding?.key === "payment") {
    const methods = await ctx.tools.call("getPaymentMethods", []);
    return {
      text: `${lead}${outstanding.prompt} Nothing is charged until you confirm the review.`,
      blocks: [
        {
          kind: "payment-selection",
          title: "Choose a payment method",
          methods,
          selectedId: session.payment?.methodId,
          amountUsd: session.quote?.totalUsd ?? 0,
        },
        progressBlock(session),
      ],
      suggestions: [],
      contextPatch: patch,
      steps: options.steps,
    };
  }

  if (outstanding?.key === "contact" || outstanding?.key === "travelers" || outstanding?.key === "documents") {
    const saved = await ctx.tools.call("getSavedTravelers", []);
    return {
      text: `${lead}${outstanding.prompt}`,
      blocks: [
        {
          kind: "traveler-form",
          title: outstanding.key === "documents" ? "Traveller documents" : "Who's travelling?",
          note:
            session.quote && outstanding.key === "contact"
              ? `Holding ${usd(session.quote.totalUsd)} for ${session.selection.checkIn} → ${session.selection.checkOut}. Nothing is charged yet.`
              : undefined,
          required: travelersNeeded(session),
          contact: session.contact,
          travelers: session.travelers,
          saved,
          needsDocuments: outstanding.key === "documents",
        },
        progressBlock(session),
      ],
      suggestions: saved.length ? [`Use ${saved[0].fullName}`] : [],
      contextPatch: patch,
      steps: options.steps,
    };
  }

  if (outstanding) {
    return {
      text: `${lead}${outstanding.prompt}`,
      blocks: [
        { kind: "clarification", question: outstanding.prompt, options: [], requirement: outstanding.key },
        progressBlock(session),
      ],
      suggestions: [],
      contextPatch: patch,
      steps: options.steps,
    };
  }

  // Everything is in place — go straight to the review.
  return requestConfirmation({ ...ctx, context: patch });
}

/** The visible state of the workflow, so progress is never a mystery. */
function progressBlock(session: AIBookingSession): AIBlock {
  const order: Array<[string, AIBookingSession["state"][]]> = [
    ["Availability checked", ["availability_check", "pricing_check", "collecting_information", "review", "awaiting_confirmation", "processing", "confirmed"]],
    ["Price confirmed", ["pricing_check", "collecting_information", "review", "awaiting_confirmation", "processing", "confirmed"]],
    ["Your details", ["review", "awaiting_confirmation", "processing", "confirmed"]],
    ["Your confirmation", ["processing", "confirmed"]],
    ["Booked", ["confirmed"]],
  ];

  const reached = new Set(session.trail);
  return {
    kind: "booking-progress",
    title: BOOKING_STATE_LABEL[session.state],
    state: session.state,
    steps: order.map(([label, states], index) => {
      const done = states.some((state) => reached.has(state));
      const active = !done && order.slice(0, index).every(([, prior]) => prior.some((s) => reached.has(s)));
      return { label, status: done ? "done" : active ? "active" : "pending" };
    }),
  };
}
