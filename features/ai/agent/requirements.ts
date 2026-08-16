/**
 * What a booking still needs.
 *
 * The rule this module exists to enforce is a courtesy one: **never ask for
 * something you already have.** A signed-in traveller with a saved passport
 * should be asked for nothing but a confirmation, and an assistant that asks
 * for their name anyway is worse than a form.
 *
 * Requirements are recomputed from scratch every turn rather than being ticked
 * off incrementally, so a traveller who changes their mind ("actually, four of
 * us") gets the right follow-up question instead of a stale checklist.
 */

import type {
  AIAuthContext,
  AIBookingRequirement,
  AIBookingSession,
} from "@/types/ai";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Verticals that legally need document details before they can be filed. */
function needsDocuments(session: AIBookingSession): boolean {
  return session.subject.vertical === "visa";
}

/** How many named travellers the booking needs. Ground transport needs one. */
export function travelersNeeded(session: AIBookingSession): number {
  if (session.subject.vertical === "transport") return 1;
  return Math.max(1, session.selection.guests);
}

/**
 * Everything outstanding, in the order it should be asked for.
 *
 * Order is deliberate: identity before details before money. Asking for a card
 * before a name reads as a shakedown; asking for a passport before the price is
 * agreed wastes the traveller's time on a booking they may not want.
 */
export function requirementsFor(
  session: AIBookingSession,
  auth?: AIAuthContext,
): AIBookingRequirement[] {
  const requirements: AIBookingRequirement[] = [];

  requirements.push({
    key: "authentication",
    label: "Signed in",
    prompt: "Booking needs an account so your confirmation and invoice have somewhere to go.",
    satisfied: Boolean(auth?.authenticated),
    required: true,
  });

  requirements.push({
    key: "dates",
    label: "Dates",
    prompt: "Which dates should I book?",
    satisfied: Boolean(session.selection.checkIn && session.selection.checkOut),
    required: true,
  });

  requirements.push({
    key: "guests",
    label: "Guests",
    prompt: "How many people is this for?",
    satisfied: session.selection.guests >= 1,
    required: true,
  });

  const contact = session.contact;
  const contactSatisfied = Boolean(
    contact && contact.fullName.trim().length > 1 && EMAIL_RE.test(contact.email ?? ""),
  );
  requirements.push({
    key: "contact",
    label: "Lead guest",
    prompt: contact?.fullName
      ? "What's the best email for the confirmation?"
      : "Who's the booking for? I need the lead guest's name and email.",
    satisfied: contactSatisfied,
    required: true,
  });

  const needed = travelersNeeded(session);
  const named = session.travelers.filter((t) => t.fullName.trim().length > 1);
  requirements.push({
    key: "travelers",
    label: "Travellers",
    prompt:
      needed === 1
        ? "I'll put the lead guest on the booking unless you'd rather name someone else."
        : `The property needs all ${needed} guest names on the booking.`,
    // One traveller is covered by the lead contact; more have to be named.
    satisfied: needed <= 1 ? contactSatisfied : named.length >= needed,
    required: needed > 1,
  });

  requirements.push({
    key: "documents",
    label: "Passport details",
    prompt: "This one needs each traveller's passport number and nationality.",
    satisfied:
      !needsDocuments(session) ||
      (named.length > 0 && named.every((t) => (t.passportNumber ?? "").trim().length > 3)),
    required: needsDocuments(session),
  });

  requirements.push({
    key: "payment",
    label: "Payment method",
    prompt: "Which card should I charge?",
    satisfied: Boolean(session.payment?.methodId),
    required: true,
  });

  return requirements;
}

/** The first thing still missing, or `undefined` when the booking is complete. */
export function firstOutstanding(
  requirements: AIBookingRequirement[],
): AIBookingRequirement | undefined {
  return requirements.find((r) => r.required && !r.satisfied);
}

/** True when nothing required is outstanding. */
export function isComplete(requirements: AIBookingRequirement[]): boolean {
  return !firstOutstanding(requirements);
}
