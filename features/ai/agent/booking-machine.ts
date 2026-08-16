/**
 * The booking state machine.
 *
 * One table decides every legal move. That matters more here than in most
 * workflows because the illegal moves are the dangerous ones: `collecting
 * information → confirmed` is exactly the bug that charges a card without a
 * review, and a transition table makes it unrepresentable rather than merely
 * unlikely.
 *
 * The machine is pure — `(session, next) → session`. It never calls a tool, so
 * a state can't change as a side effect of asking a question, and the whole
 * workflow is testable without touching inventory.
 */

import type { AIBookingSession, AIBookingState } from "@/types/ai-booking";

/** Which states each state may move to. */
const TRANSITIONS: Record<AIBookingState, AIBookingState[]> = {
  idle: ["selection"],
  selection: ["availability_check", "cancelled"],
  availability_check: ["pricing_check", "availability_failed", "cancelled"],
  pricing_check: ["collecting_information", "review", "price_changed", "availability_failed", "cancelled"],
  collecting_information: ["collecting_information", "review", "validation_failed", "cancelled"],
  review: ["awaiting_confirmation", "collecting_information", "validation_failed", "cancelled"],
  awaiting_confirmation: [
    "processing",
    "collecting_information",
    "price_changed",
    "availability_failed",
    "cancelled",
  ],
  processing: [
    "confirmed",
    "payment_failed",
    "booking_failed",
    "price_changed",
    "availability_failed",
  ],
  confirmed: [],

  // --- recovery paths out of the failure states -----------------------------
  availability_failed: ["selection", "availability_check", "cancelled"],
  price_changed: ["review", "awaiting_confirmation", "cancelled"],
  validation_failed: ["collecting_information", "review", "cancelled"],
  payment_failed: ["collecting_information", "awaiting_confirmation", "cancelled"],
  booking_failed: ["selection", "awaiting_confirmation", "cancelled"],
  cancelled: ["selection"],
};

/** True when `next` is reachable from `from`. */
export function canTransition(from: AIBookingState, next: AIBookingState): boolean {
  return TRANSITIONS[from]?.includes(next) ?? false;
}

/**
 * Move a session to a new state.
 *
 * An illegal move is a programming error, not a traveller error, so it throws
 * rather than silently correcting itself — a booking that quietly skipped its
 * review step is worse than a loud crash in development.
 */
export function transition(
  session: AIBookingSession,
  next: AIBookingState,
  at: string,
): AIBookingSession {
  if (session.state === next) {
    return { ...session, updatedAt: at };
  }
  if (!canTransition(session.state, next)) {
    throw new Error(`Illegal booking transition: ${session.state} → ${next}`);
  }
  return {
    ...session,
    state: next,
    updatedAt: at,
    trail: [...session.trail, next],
  };
}

/** Terminal states — nothing further happens without starting again. */
export function isTerminal(state: AIBookingState): boolean {
  return state === "confirmed" || state === "cancelled";
}

/** True while the traveller still has something to do. */
export function isActive(state: AIBookingState): boolean {
  return !isTerminal(state) && state !== "idle";
}

/** Human label for each state — used by the progress trail and diagnostics. */
export const BOOKING_STATE_LABEL: Record<AIBookingState, string> = {
  idle: "Not started",
  selection: "Option selected",
  availability_check: "Checking availability",
  pricing_check: "Checking the latest price",
  collecting_information: "Collecting your details",
  review: "Ready for your review",
  awaiting_confirmation: "Waiting for your confirmation",
  processing: "Creating your booking",
  confirmed: "Confirmed",
  availability_failed: "No longer available",
  price_changed: "Price changed",
  validation_failed: "Details incomplete",
  payment_failed: "Payment declined",
  booking_failed: "Booking failed",
  cancelled: "Cancelled",
};
