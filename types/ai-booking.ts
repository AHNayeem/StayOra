/**
 * AI booking domain — the models the travel agent reasons over when it takes a
 * traveller from "book this one" to a confirmed reference.
 *
 * These types are deliberately free of any UI or provider concern. They are the
 * shape a real `POST /bookings` flow would carry, so the agent, the state
 * machine, the tools and the repositories all speak the same language and a
 * future API implementation slots in underneath without touching the layers
 * above. Every money amount is **base USD**, like the rest of the platform.
 *
 * Nothing in here is ever *produced* by the model: quotes, availability,
 * policies and references only enter these structures from a tool result, which
 * is what makes {@link AIBookingQuote.source} worth carrying.
 */

import type { ListingVertical } from "./booking";

/* -------------------------------------------------------------------------- */
/* Errors                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Every way a turn can fail, as data rather than a thrown string.
 *
 * The agent maps each one onto a user-facing block; nothing internal (stack,
 * module path, engine detail) ever reaches the traveller.
 */
export const AI_ERROR_CODES = [
  "tool_error",
  "validation_failed",
  "availability_lost",
  "price_changed",
  "booking_failed",
  "authentication_required",
  "payment_required",
  "payment_failed",
  "unsupported_request",
  "missing_information",
  "limit_exceeded",
] as const;
export type AIErrorCode = (typeof AI_ERROR_CODES)[number];

/** A failure the traveller can be shown, with the recovery the agent offers. */
export interface AIBookingFailure {
  code: AIErrorCode;
  title: string;
  /** One sentence, traveller-safe. Never an internal message. */
  message: string;
  /** True when retrying the same step could plausibly succeed. */
  recoverable: boolean;
  /** Label for the primary recovery affordance, when one exists. */
  retryLabel?: string;
  /** Extra detail rendered as a bullet list (e.g. availability blockers). */
  details?: string[];
}

/* -------------------------------------------------------------------------- */
/* Booking state machine                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The states a booking passes through. Scattered booleans (`isBooking`,
 * `hasError`) can't express "priced but not yet confirmed" or "held while the
 * traveller fills in a passport number", so the workflow is an explicit machine
 * and the UI renders whatever state it is in.
 */
export const AI_BOOKING_STATES = [
  "idle",
  "selection",
  "availability_check",
  "pricing_check",
  "collecting_information",
  "review",
  "awaiting_confirmation",
  "processing",
  "confirmed",
  // --- failure states ---
  "availability_failed",
  "price_changed",
  "validation_failed",
  "payment_failed",
  "booking_failed",
  "cancelled",
] as const;
export type AIBookingState = (typeof AI_BOOKING_STATES)[number];

/** States from which no further progress happens without a new instruction. */
export const AI_BOOKING_FAILURE_STATES: AIBookingState[] = [
  "availability_failed",
  "price_changed",
  "validation_failed",
  "payment_failed",
  "booking_failed",
];

/* -------------------------------------------------------------------------- */
/* What is being booked                                                        */
/* -------------------------------------------------------------------------- */

/** The bookable entity — always a reference back to a real platform record. */
export interface AIBookingSubject {
  kind: "listing" | "flight";
  /** Catalog listing id, or flight offer id. */
  id: string;
  title: string;
  href: string;
  image?: string;
  location?: string;
  /** Present for catalog listings. */
  vertical?: ListingVertical;
  slug?: string;
  /** Present for flights: the route, e.g. "DAC → BKK". */
  route?: string;
}

/** Dates, party and room/rate choice — everything that decides the price. */
export interface AIBookingSelection {
  /** ISO `YYYY-MM-DD`. */
  checkIn: string;
  /** ISO `YYYY-MM-DD`, exclusive. Equal to `checkIn` for single-date products. */
  checkOut: string;
  nights: number;
  /** Rooms / vehicles / seats, depending on the vertical. */
  units: number;
  guests: number;
  roomTypeId?: string;
  roomTypeName?: string;
  ratePlanId?: string;
  ratePlanName?: string;
}

/* -------------------------------------------------------------------------- */
/* Pricing and availability, as returned by tools                              */
/* -------------------------------------------------------------------------- */

/** One line of a priced booking. */
export interface AIPriceLine {
  label: string;
  detail?: string;
  amountUsd: number;
  kind: "base" | "addon" | "discount" | "fee" | "tax" | "insurance";
}

/**
 * A priced, timestamped quote. `source` and `quotedAt` are what make
 * revalidation meaningful: the agent can always say *when* and *from what* a
 * number came, and compare it against a fresh call before charging anything.
 */
export interface AIBookingQuote {
  /**
   * The room and rate this price is for.
   *
   * Carried on the quote rather than left implicit: without it a re-quote picks
   * the cheapest option again, so a traveller could review one room and be
   * charged for another the moment a rate moved.
   */
  roomTypeId: string;
  roomTypeName: string;
  ratePlanId: string;
  ratePlanName: string;
  lines: AIPriceLine[];
  subtotalUsd: number;
  discountUsd: number;
  feesUsd: number;
  taxesUsd: number;
  totalUsd: number;
  /** Average nightly rate per unit, when the product is priced per night. */
  perNightUsd?: number;
  cancellationPolicy: string;
  refundable: boolean;
  /** Units still purchasable at this price. */
  unitsLeft: number;
  /** Stay rules the traveller must know before confirming. */
  restrictions: string[];
  /** ISO timestamp supplied by the caller — the engine never reads the clock. */
  quotedAt: string;
  /** The tool that produced it, e.g. `"getPricing"`. */
  source: string;
}

/** What a re-check found. */
export type AIAvailabilityStatus =
  | "available"
  | "price_changed"
  | "no_longer_available"
  | "booking_restriction";

export interface AIAvailabilityResult {
  status: AIAvailabilityStatus;
  available: boolean;
  unitsLeft: number;
  blockers: Array<{ code: string; message: string }>;
  /** Present whenever the tool could still price the selection. */
  quote?: AIBookingQuote;
}

/** The outcome of revalidating a held quote against a fresh one. */
export interface AIRevalidation {
  status: AIAvailabilityStatus;
  previousTotalUsd: number;
  currentTotalUsd: number;
  /** Signed difference, positive when the price went up. */
  deltaUsd: number;
  blockers: Array<{ code: string; message: string }>;
  quote?: AIBookingQuote;
}

/* -------------------------------------------------------------------------- */
/* Information the traveller has to supply                                     */
/* -------------------------------------------------------------------------- */

export interface AIContactInformation {
  fullName: string;
  email: string;
  phone?: string;
  /** ISO 3166-1 alpha-2. */
  countryCode?: string;
}

export interface AITravelerInfo {
  fullName: string;
  type: "adult" | "child" | "infant";
  email?: string;
  phone?: string;
  nationality?: string;
  passportNumber?: string;
  /** Set when the traveller came from the account's saved list. */
  savedTravelerId?: string;
}

/** A stored way to pay. Never carries a PAN — only display metadata. */
export interface AIPaymentMethod {
  id: string;
  label: string;
  kind: "card" | "wallet" | "bank" | "cod";
  brand: string;
  last4?: string;
  expiryLabel?: string;
  description?: string;
  isDefault?: boolean;
}

export interface AIPaymentSelection {
  methodId: string;
  label: string;
  brand: string;
  last4?: string;
}

/** The result of asking the payment provider to take money. */
export interface AIPaymentResult {
  status: "captured" | "requires_authentication" | "failed";
  /** Gateway reference — always from the provider, never invented. */
  reference?: string;
  amountUsd: number;
  message?: string;
  /** Attempt id, so an authentication step can be completed against it. */
  attemptId?: string;
}

/** One thing the booking still needs before it can be reviewed. */
export const AI_BOOKING_REQUIREMENTS = [
  "authentication",
  "dates",
  "guests",
  "contact",
  "travelers",
  "documents",
  "payment",
] as const;
export type AIBookingRequirementKey = (typeof AI_BOOKING_REQUIREMENTS)[number];

export interface AIBookingRequirement {
  key: AIBookingRequirementKey;
  label: string;
  /** What the traveller is being asked for, in one sentence. */
  prompt: string;
  satisfied: boolean;
  /** True when it can't be skipped or defaulted. */
  required: boolean;
}

/* -------------------------------------------------------------------------- */
/* The session the agent carries between turns                                 */
/* -------------------------------------------------------------------------- */

/**
 * A booking in progress.
 *
 * Serializable by construction: it round-trips through the chat's context
 * object every turn, which is what lets a stateless provider (or a future
 * stateless HTTP endpoint) resume a multi-step booking without a server session.
 */
export interface AIBookingSession {
  id: string;
  state: AIBookingState;
  subject: AIBookingSubject;
  selection: AIBookingSelection;
  /** The quote the traveller has been shown. Only ever from a tool. */
  quote?: AIBookingQuote;
  /** The quote captured at selection time, kept to detect price movement. */
  originalTotalUsd?: number;
  contact?: AIContactInformation;
  travelers: AITravelerInfo[];
  specialRequests?: string;
  payment?: AIPaymentSelection;
  /** Requirements computed on the last pass — drives what is asked for next. */
  requirements: AIBookingRequirement[];
  failure?: AIBookingFailure;
  /** Set once the booking exists. */
  bookingId?: string;
  reference?: string;
  /** ISO timestamp of the last state change, for display and staleness checks. */
  updatedAt: string;
  /** Every state the booking has been in, oldest first. */
  trail: AIBookingState[];
}

/** A booking the traveller already holds, as the agent reports it. */
export interface AIBookingRecord {
  id: string;
  reference: string;
  title: string;
  status: string;
  /** ISO date. */
  startDate: string;
  endDate?: string;
  location?: string;
  guests?: number;
  totalUsd: number;
  cancellationPolicy: string;
  href: string;
  image?: string;
  kind: "stay" | "flight";
}

/** What cancelling would cost and return, as priced by the platform. */
export interface AICancellationQuote {
  bookingId: string;
  reference: string;
  refundUsd: number;
  feeUsd: number;
  /** The policy text the numbers came from. Never paraphrased by the model. */
  policy: string;
  refundable: boolean;
}
