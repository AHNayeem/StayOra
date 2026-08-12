/**
 * AI assistant domain types — the contract between the assistant UI and
 * whatever produces its answers.
 *
 * The UI renders an {@link AIResponse}; it never knows whether that response
 * came from the deterministic {@link "@/features/ai/provider/mock-provider"} or
 * from a real LLM. Swapping providers therefore touches no component. Every
 * money amount is **base USD** (like listing prices and traveler bookings) so
 * the locale currency switcher reprices AI answers exactly like the rest of the
 * site, and nothing here is region-specific.
 */

import type { ListingVertical, Review } from "./booking";
import type { Listing } from "./catalog";
import type { ReviewSummary } from "./detail";
import type {
  CabinClass,
  FlightBooking,
  FlightOffer,
  FlightSearchQuery,
  TripType,
  VisaRequirement,
} from "./flight";
import type { TravelerBooking } from "./traveler";

/* -------------------------------------------------------------------------- */
/* Intents                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * What the traveller is asking for. The mock engine classifies a message into
 * exactly one of these; a real LLM would map its tool choice onto the same set,
 * which is why the list is deliberately about *travel goals*, not phrasing.
 */
export const AI_INTENTS = [
  "greet",
  "help",
  "search-hotels",
  "search-flights",
  "search-tours",
  "search-activities",
  "search-transport",
  "search-visa",
  "compare",
  "plan-trip",
  "budget",
  "itinerary",
  "recommend",
  "my-bookings",
  "booking-draft",
  "summarize-reviews",
  "set-context",
  "unknown",
] as const;
export type AIIntent = (typeof AI_INTENTS)[number];

/* -------------------------------------------------------------------------- */
/* Conversation context                                                        */
/* -------------------------------------------------------------------------- */

/** Party size the traveller is planning for. */
export interface AITravelers {
  adults: number;
  children: number;
}

/**
 * The structured memory of a conversation — deliberately *not* a transcript.
 *
 * Only facts that change what a follow-up question means are kept, so "find me
 * a hotel" after "I want to visit Dubai" resolves correctly without replaying
 * the whole chat. A real LLM provider receives this same object as its system
 * context, keeping token cost bounded.
 */
export interface AITripContext {
  /** Human destination label, e.g. "Dubai" or "Bali, Indonesia". */
  destination?: string;
  /** City component of the destination, used for catalog matching. */
  destinationCity?: string;
  destinationCountry?: string;
  /** Destination airport IATA, when the destination resolves to one. */
  destinationCode?: string;
  /** Origin airport IATA for flight searches. */
  originCode?: string;
  /** Outbound / check-in date, ISO `YYYY-MM-DD`. */
  startDate?: string;
  /** Return / check-out date, ISO `YYYY-MM-DD`. */
  endDate?: string;
  /** Nights of stay (drives trip length and hotel totals). */
  nights?: number;
  travelers?: AITravelers;
  /** Total trip budget in base USD. */
  budgetUsd?: number;
  /** Per-night ceiling in base USD, e.g. "hotels under $150". */
  maxNightlyUsd?: number;
  cabin?: CabinClass;
  tripType?: TripType;
  /** Non-stop flights only. */
  directOnly?: boolean;
  /** Trip style tags derived from the ask: family, couple, business… */
  styles?: AITripStyle[];
  /** Amenity keywords the traveller asked for (matched against listing data). */
  amenities?: string[];
  /** Preferred stay vertical when the traveller was specific ("hostel", "villa"). */
  stayVertical?: ListingVertical;
  /** Minimum review rating asked for, 0–5. */
  minRating?: number;
  /** Listing ids the traveller has picked or been shown for comparison. */
  selectedListingIds?: string[];
  /** Flight offer ids the traveller has picked or been shown for comparison. */
  selectedOfferIds?: string[];
  /** The most recent plan, so "save it" / "add an activity" have a subject. */
  planId?: string;
}

/** Travel styles the assistant can bias recommendations toward. */
export const AI_TRIP_STYLES = [
  "family",
  "couple",
  "solo",
  "business",
  "luxury",
  "budget",
  "beach",
  "adventure",
  "culture",
  "airport",
] as const;
export type AITripStyle = (typeof AI_TRIP_STYLES)[number];

/* -------------------------------------------------------------------------- */
/* Rich response blocks                                                        */
/* -------------------------------------------------------------------------- */

/** A catalog listing the assistant is recommending, with its reason and price. */
export interface AIListingRef {
  listing: Listing;
  /** Detail-page link, built from the vertical registry. */
  href: string;
  /** Why this one was surfaced — derived from real fields, never invented. */
  reason?: string;
  /** Stay total across {@link nights} in base USD, when a duration is known. */
  totalUsd?: number;
  nights?: number;
}

/** A flight offer the assistant is recommending. */
export interface AIFlightRef {
  offer: FlightOffer;
  /** Offer detail-page link. */
  href: string;
  reason?: string;
}

/** One row of a side-by-side comparison. */
export interface AIComparisonRow {
  label: string;
  /** One cell per subject, in subject order. `—` for "not applicable". */
  values: string[];
  /** Index of the winning subject, when one row has an objective winner. */
  bestIndex?: number;
}

/** A column header in a comparison table. */
export interface AIComparisonSubject {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  image?: string;
}

/** A single scheduled entry inside a trip day. */
export interface AITripDayItem {
  id: string;
  /** Local time label, e.g. "09:30" — omitted for open-ended entries. */
  time?: string;
  kind: "flight" | "transport" | "stay" | "activity" | "tour" | "meal" | "free";
  title: string;
  detail?: string;
  href?: string;
  /** Base USD cost attributed to this entry (0 when already counted). */
  priceUsd?: number;
  /** Catalog listing id, when this entry came from a real listing. */
  listingId?: string;
}

/** One day of a generated itinerary. */
export interface AITripDay {
  day: number;
  /** ISO `YYYY-MM-DD` when dates are known. */
  date?: string;
  title: string;
  items: AITripDayItem[];
}

/** A complete trip proposal assembled entirely from Otithee data. */
export interface AITripPlan {
  id: string;
  destination: string;
  destinationCode?: string;
  originCode?: string;
  nights: number;
  travelers: AITravelers;
  startDate?: string;
  endDate?: string;
  days: AITripDay[];
  flight?: AIFlightRef;
  hotel?: AIListingRef;
  transport?: AIListingRef;
  activities: AIListingRef[];
  /** Sum of every priced component, base USD. */
  totalUsd: number;
}

/** One line of a budget breakdown. */
export interface AIBudgetLine {
  label: string;
  detail?: string;
  amountUsd: number;
  kind: "flight" | "stay" | "activity" | "transport" | "fees";
  href?: string;
}

/** A concrete, data-backed way to bring a trip under budget. */
export interface AIBudgetAlternative {
  kind: "stay" | "flight" | "activity";
  label: string;
  detail?: string;
  /** Exact difference against the current pick, base USD. Never estimated. */
  savesUsd: number;
  href: string;
}

/** The budget optimiser's output. */
export interface AIBudget {
  /** The traveller's stated budget, base USD; absent when they gave none. */
  budgetUsd?: number;
  lines: AIBudgetLine[];
  subtotalUsd: number;
  /** Taxes and platform fees, computed with the same rates checkout uses. */
  taxesUsd: number;
  totalUsd: number;
  /** Positive when the plan fits, computed only when a budget was given. */
  remainingUsd?: number;
  /** Positive amount the plan exceeds the budget by. */
  overByUsd?: number;
  alternatives: AIBudgetAlternative[];
}

/** A prepared, unconfirmed booking. Payment is never taken by the assistant. */
export interface AIBookingDraft {
  listing: Listing;
  href: string;
  /** ISO check-in / check-out; empty strings for single-date verticals. */
  checkIn: string;
  checkOut: string;
  /** ISO date for single-date verticals (activities, visas). */
  singleDate: string;
  nights: number;
  guests: number;
  quantities: Record<string, number>;
  subtotalUsd: number;
  serviceFeeUsd: number;
  totalUsd: number;
  cancellationPolicy: string;
  /** Pre-filled `/checkout` URL — the same one the booking widget produces. */
  checkoutHref: string;
}

/** A recurring theme mined from a listing's actual reviews. */
export interface AIReviewTheme {
  label: string;
  /** How many of the listing's reviews mention it. */
  mentions: number;
  sentiment: "positive" | "mixed";
}

/**
 * A renderable unit of an assistant answer. The chat renders a list of these;
 * adding a capability means adding a variant here plus one renderer, never
 * changing the transport or the provider interface.
 */
export type AIBlock =
  | {
      kind: "listings";
      title: string;
      note?: string;
      vertical: ListingVertical;
      items: AIListingRef[];
      /** Link to the equivalent full search on the site. */
      moreHref?: string;
      /** Offer "compare these" affordance (needs ≥2 items). */
      comparable?: boolean;
    }
  | {
      kind: "flights";
      title: string;
      note?: string;
      items: AIFlightRef[];
      query: FlightSearchQuery;
      moreHref?: string;
      comparable?: boolean;
    }
  | {
      kind: "comparison";
      title: string;
      subjects: AIComparisonSubject[];
      rows: AIComparisonRow[];
      recommendation: string;
    }
  | { kind: "trip-plan"; plan: AITripPlan }
  | { kind: "itinerary"; plan: AITripPlan }
  | { kind: "budget"; budget: AIBudget }
  | { kind: "booking-draft"; draft: AIBookingDraft }
  | {
      kind: "bookings";
      title: string;
      stays: TravelerBooking[];
      flights: FlightBooking[];
    }
  | {
      kind: "visa";
      requirement: VisaRequirement;
      services: AIListingRef[];
    }
  | {
      kind: "reviews";
      listingTitle: string;
      href: string;
      summary: ReviewSummary;
      themes: AIReviewTheme[];
      quotes: Review[];
    }
  | { kind: "facts"; title: string; items: Array<{ label: string; value: string }> }
  | { kind: "notice"; tone: "info" | "warning"; text: string };

/* -------------------------------------------------------------------------- */
/* Messages, requests and responses                                            */
/* -------------------------------------------------------------------------- */

export type AIMessageRole = "user" | "assistant";
export type AIMessageStatus = "pending" | "done" | "error";

/** One turn in the visible conversation. */
export interface AIMessage {
  id: string;
  role: AIMessageRole;
  text: string;
  blocks?: AIBlock[];
  /** Follow-up chips offered under an assistant answer. */
  suggestions?: string[];
  status: AIMessageStatus;
  /** The user text that produced this answer — used by Retry. */
  sourceText?: string;
}

/**
 * What surface the assistant was opened from. Lets the same engine answer
 * "is breakfast included?" about *this* hotel without the user naming it.
 * Deliberately small and serializable so Server Components can pass it down.
 */
export interface AIPageContext {
  /** Human label for the current subject, e.g. the hotel name. */
  label?: string;
  /** Prompt chips tailored to this surface. */
  suggestions?: string[];
  /** The catalog listing in focus. */
  listing?: {
    vertical: ListingVertical;
    slug: string;
    title: string;
    /** `location.label`, so the engine can seed the destination. */
    destination?: string;
  };
  /** The flight offer in focus (encoded offer id). */
  offerId?: string;
  /** Destination seed for search surfaces. */
  destination?: string;
  /** Origin airport IATA seed. */
  originCode?: string;
}

/** Everything a provider needs to answer one turn. */
export interface AIRequest {
  /** The traveller's raw message. */
  message: string;
  /** Structured memory from earlier turns. */
  context: AITripContext;
  /** Where the assistant was opened from, if anywhere specific. */
  page?: AIPageContext;
  /**
   * Today's date (ISO `YYYY-MM-DD`), supplied by the caller rather than read
   * from the clock inside the engine — that keeps the engine pure and testable
   * and avoids server/client hydration drift.
   */
  today: string;
  /** ISO 3166-1 alpha-2 of the traveller's country, from locale preferences. */
  countryCode?: string;
}

/** A provider's answer to one turn. */
export interface AIResponse {
  /** The prose part of the answer. Always present, always short. */
  text: string;
  blocks: AIBlock[];
  /** Follow-up chips. */
  suggestions: string[];
  /** Facts learned this turn, merged into {@link AITripContext} by the caller. */
  contextPatch: AITripContext;
  /** The intent the engine settled on — surfaced for debugging and analytics. */
  intent: AIIntent;
}

/**
 * The single seam every AI implementation satisfies.
 *
 * `MockAIProvider` implements it today with deterministic parsing plus real
 * Otithee service calls. A future `OpenAIProvider` / `AnthropicProvider` would
 * implement the same method by exposing the tool registry as function calls and
 * mapping tool results onto {@link AIBlock}s — with zero UI changes.
 */
export interface AIProvider {
  /** Stable identifier, e.g. "mock". Shown in diagnostics. */
  readonly id: string;
  /** Human label for the provider, e.g. "Otithee Mock Engine". */
  readonly label: string;
  respond(request: AIRequest): Promise<AIResponse>;
}
