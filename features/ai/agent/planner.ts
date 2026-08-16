/**
 * The planner — from "what did they mean" to "what am I going to do".
 *
 * It produces a list of {@link AgentAction}s, not prose. That separation is the
 * point of the whole architecture: an LLM provider replaces *this function* and
 * nothing else, because every guardrail, budget and renderer downstream is
 * written against the action union rather than against the model's words.
 *
 * Plans are short by design. A turn that fans out into six actions is usually a
 * turn that misunderstood the question, and the policy budget caps it anyway.
 */

import type { AITripContext, AgentAction, AIRequest } from "@/types/ai";
import type { ParsedMessage } from "../nlu/parse";
import { resolveReference } from "./reference";

export interface PlanInput {
  request: AIRequest;
  parsed: ParsedMessage;
  context: AITripContext;
}

/** Decide the turn's actions. Pure — it calls nothing and changes nothing. */
export function planTurn({ request, parsed, context }: PlanInput): AgentAction[] {
  /* --- a structured action from the UI is already a decision --------------- */
  const action = request.action;
  if (action && action.kind !== "ask") {
    switch (action.kind) {
      case "select":
        return [{ type: "select-item", ref: action.ref }];
      case "start-booking":
        return [{ type: "start-booking", ref: action.ref }];
      case "provide-info":
        return [{ type: "collect-booking-info", provided: action }];
      case "select-payment":
        return [{ type: "select-payment", methodId: action.methodId }];
      case "confirm-booking":
        return [{ type: "confirm-booking" }];
      // Accepting a *changed* price is agreeing to look, not agreeing to pay:
      // the traveller confirmed a different number, so they get a fresh review
      // and a fresh confirmation.
      case "accept-price-change":
        return [{ type: "request-confirmation" }];
      case "abandon-booking":
        return [{ type: "abandon-booking" }];
      case "cancel-booking":
        return [
          {
            type: "cancel-booking",
            bookingId: action.bookingId,
            confirmed: Boolean(action.confirmed),
          },
        ];
      case "modify-booking":
        return [
          { type: "modify-booking", bookingId: action.bookingId, patch: action.patch },
        ];
    }
  }

  /* --- otherwise, plan from the parsed message ---------------------------- */
  switch (parsed.intent) {
    case "search-hotels":
      return [{ type: "search-listings", vertical: "stays" }];
    case "search-tours":
      return [{ type: "search-listings", vertical: "tours" }];
    case "search-activities":
      return [{ type: "search-listings", vertical: "activities" }];
    case "search-transport":
      return [{ type: "search-listings", vertical: "transport" }];
    case "search-flights":
      return [{ type: "search-flights" }];
    case "search-visa":
      return [{ type: "search-visa" }];
    case "recommend":
      return [{ type: "recommend" }];
    case "refine":
      return [{ type: "search-listings", vertical: "stays" }];

    case "compare": {
      // "Compare hotels in Bali" with nothing on the table yet is two steps,
      // not a complaint — find them first, then compare what was found.
      const known =
        (context.selectedListingIds?.length ?? 0) >= 2 ||
        (context.selectedOfferIds?.length ?? 0) >= 2;
      if (known) return [{ type: "compare", kind: parsed.compareFlights ? "flight" : "listing" }];
      if (parsed.wants.flight) return [{ type: "search-flights" }, { type: "compare", kind: "flight" }];
      return [
        { type: "search-listings", vertical: "stays" },
        { type: "compare", kind: "listing" },
      ];
    }

    case "plan-trip":
      return [{ type: "plan-trip", focus: "full" }];
    case "itinerary":
      return [{ type: "plan-trip", focus: "itinerary" }];
    case "budget":
      return [{ type: "plan-trip", focus: "budget" }];
    case "summarize-reviews":
      return [{ type: "summarize-reviews" }];
    case "my-bookings":
      return [{ type: "list-bookings" }];

    case "start-booking":
    case "booking-draft": {
      const ref = resolveReference(parsed.reference, context).ref ?? context.selection;
      // A bare reference ("the second one") selects; booking stays an explicit
      // act, so only a booking verb opens the workflow.
      if (!parsed.explicitBooking && ref) return [{ type: "select-item", ref }];
      return [{ type: "start-booking", ref }];
    }

    case "provide-info":
      return [{ type: "collect-booking-info" }];

    case "confirm-booking":
      return [{ type: "confirm-booking" }];

    case "cancel-booking": {
      const target = parsed.bookingReference ?? context.recentBookingIds?.[0];
      if (!target) return [{ type: "list-bookings" }];
      // Never pre-confirmed from a sentence: naming a booking and agreeing to
      // lose it are two different acts, and the second needs its own "yes".
      return [{ type: "cancel-booking", bookingId: target, confirmed: false }];
    }

    case "modify-booking": {
      // A "no" against a booking in progress means abandon, not amend.
      if (parsed.negation && context.booking) return [{ type: "abandon-booking" }];
      const target = parsed.bookingReference ?? context.recentBookingIds?.[0];
      if (!target) return [{ type: "list-bookings" }];
      return [
        {
          type: "modify-booking",
          bookingId: target,
          patch: {
            checkIn: parsed.slots.startDate,
            checkOut: parsed.slots.endDate,
            guests: parsed.slots.travelers
              ? parsed.slots.travelers.adults + parsed.slots.travelers.children
              : undefined,
          },
        },
      ];
    }

    case "set-context":
      return [{ type: "answer", intent: "set-context" }];
    case "greet":
      return [{ type: "answer", intent: "greet" }];
    case "help":
      return [{ type: "answer", intent: "help" }];
    default:
      return [{ type: "answer", intent: "unknown" }];
  }
}
