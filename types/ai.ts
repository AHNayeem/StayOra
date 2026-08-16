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

import type {
  AIAvailabilityResult,
  AIBookingFailure,
  AIBookingRecord,
  AIBookingRequirement,
  AIBookingSession,
  AIBookingState,
  AICancellationQuote,
  AIContactInformation,
  AIErrorCode,
  AIPaymentMethod,
  AIRevalidation,
  AITravelerInfo,
} from "./ai-booking";
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
  /** "book the second one" — enters the guided booking workflow. */
  "start-booking",
  /** The traveller supplied guest/contact/payment details. */
  "provide-info",
  /** An explicit "yes, confirm" against a review block. */
  "confirm-booking",
  "cancel-booking",
  "modify-booking",
  /** "make it cheaper", "show better options" — re-run with a changed constraint. */
  "refine",
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

  /* --- reference resolution ------------------------------------------------ */

  /**
   * What the last answer put on screen, in the order it was shown.
   *
   * This is what makes "book the second one" and "the cheaper option" resolve
   * to a real entity instead of a guess. It holds only identifiers and the
   * facts needed to rank them — never prices the agent could then quote from
   * memory, which must always come back from a tool.
   */
  lastResults?: AIResultSet;
  /** The single item the traveller has settled on. */
  selection?: AISelectionRef;
  /** Rooms / units asked for, when stated separately from the party. */
  rooms?: number;
  /** Free-text preferences the traveller has expressed across the session. */
  preferences?: string[];

  /* --- booking ------------------------------------------------------------- */

  /** The booking in progress, if any. Survives turns; cleared on completion. */
  booking?: AIBookingSession;
  /** Contact details already gathered, reusable across bookings this session. */
  contact?: AIContactInformation;
  /** Traveller details already gathered this session (names, documents). */
  travelerDetails?: AITravelerInfo[];
  /**
   * Bookings this session created, newest first — so "cancel it" after a
   * confirmation resolves without another search.
   */
  recentBookingIds?: string[];
}

/** One entry of {@link AIResultSet} — an addressable thing that was shown. */
export interface AIResultRef {
  kind: "listing" | "flight";
  id: string;
  title: string;
  /** Base USD price the tool returned, used only to resolve "the cheaper one". */
  priceUsd: number;
  rating?: number;
  vertical?: ListingVertical;
  slug?: string;
}

/** The ordered result list from the previous answer. */
export interface AIResultSet {
  kind: "listing" | "flight";
  items: AIResultRef[];
  /** The intent that produced it, so "show cheaper ones" can re-run it. */
  intent: AIIntent;
}

/** The item the traveller has chosen to act on. */
export interface AISelectionRef {
  kind: "listing" | "flight";
  id: string;
  title: string;
  vertical?: ListingVertical;
  slug?: string;
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
  | { kind: "notice"; tone: "info" | "warning"; text: string }
  /* --- booking workflow --------------------------------------------------- */
  | {
      kind: "booking-progress";
      title: string;
      steps: AIProgressStep[];
      state: AIBookingState;
    }
  | {
      kind: "booking-review";
      /** The full, tool-sourced summary the traveller confirms against. */
      session: AIBookingSession;
      /** Copy for the primary action, e.g. "Confirm booking". */
      confirmLabel: string;
    }
  | { kind: "booking-confirmation"; session: AIBookingSession; manageHref: string }
  | { kind: "booking-error"; failure: AIBookingFailure; session?: AIBookingSession }
  | {
      kind: "price-change";
      revalidation: AIRevalidation;
      session: AIBookingSession;
    }
  | {
      kind: "availability-change";
      result: AIAvailabilityResult;
      session: AIBookingSession;
      /** Real alternatives found by a tool, never invented. */
      alternatives: AIListingRef[];
    }
  | {
      kind: "clarification";
      question: string;
      /** Quick answers; picking one sends it as the next message. */
      options: string[];
      /** Which requirement this question is closing, when it is one. */
      requirement?: AIBookingRequirement["key"];
    }
  | {
      kind: "action-required";
      title: string;
      text: string;
      /** In-app link, e.g. `/login?next=…`. */
      href?: string;
      actionLabel: string;
      tone: "info" | "warning";
    }
  | {
      kind: "traveler-form";
      title: string;
      note?: string;
      /** How many travellers the booking needs. */
      required: number;
      /** Pre-fill from the profile/session so nothing is asked for twice. */
      contact?: AIContactInformation;
      travelers: AITravelerInfo[];
      /** Saved travellers offered as one-tap fills. */
      saved: AITravelerInfo[];
      /** True when the vertical needs passport details. */
      needsDocuments: boolean;
    }
  | {
      kind: "payment-selection";
      title: string;
      methods: AIPaymentMethod[];
      selectedId?: string;
      /** Amount that will be charged, base USD — always from a quote. */
      amountUsd: number;
    }
  | { kind: "cancellation"; quote: AICancellationQuote; booking: AIBookingRecord }
  | {
      kind: "booking-records";
      title: string;
      records: AIBookingRecord[];
    };

/** One line of the agent's visible progress trail. */
export interface AIProgressStep {
  label: string;
  status: "done" | "active" | "pending" | "failed";
  /** Short result note, e.g. "3 rooms left". Always tool-sourced. */
  detail?: string;
}

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
  /**
   * The agent's working, updated live from {@link AgentEvent}s while the turn
   * runs and kept afterwards — so a multi-step answer shows what it did rather
   * than a spinner that explains nothing.
   */
  steps?: AIProgressStep[];
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

/* -------------------------------------------------------------------------- */
/* Structured actions                                                          */
/* -------------------------------------------------------------------------- */

/**
 * What the traveller asked the agent to *do*, as data.
 *
 * Rich blocks raise these instead of synthesising a sentence for the parser to
 * re-read: a tapped "Confirm booking" is unambiguous, and round-tripping it
 * through English would be a lossy channel between two parts of the same
 * system. Free text still works — it simply becomes one of these first.
 */
export type AIUserAction =
  | { kind: "ask"; text: string }
  | { kind: "select"; ref: AISelectionRef }
  | { kind: "start-booking"; ref: AISelectionRef }
  | {
      kind: "provide-info";
      contact?: AIContactInformation;
      travelers?: AITravelerInfo[];
      specialRequests?: string;
    }
  | { kind: "select-payment"; methodId: string }
  | { kind: "confirm-booking" }
  | { kind: "accept-price-change" }
  | { kind: "abandon-booking" }
  | { kind: "cancel-booking"; bookingId: string; confirmed?: boolean }
  | {
      kind: "modify-booking";
      bookingId: string;
      patch: { checkIn?: string; checkOut?: string; guests?: number; units?: number };
    };

/**
 * What the agent decided to do this turn.
 *
 * The planner emits these; the executor runs them. Keeping the decision
 * separate from its execution is what lets a real LLM take the planner's place
 * later — it would emit the same union, and every guardrail, limit and log
 * downstream keeps working unchanged.
 */
export type AgentAction =
  | { type: "answer"; intent: AIIntent }
  | { type: "search-listings"; vertical: "stays" | "tours" | "activities" | "transport" }
  | { type: "search-flights" }
  | { type: "search-visa" }
  | { type: "recommend" }
  | { type: "compare"; kind: "listing" | "flight" }
  | { type: "plan-trip"; focus: "full" | "itinerary" | "budget" }
  | { type: "summarize-reviews" }
  | { type: "list-bookings" }
  | { type: "select-item"; ref: AISelectionRef }
  | { type: "start-booking"; ref?: AISelectionRef }
  | { type: "collect-booking-info"; provided?: Extract<AIUserAction, { kind: "provide-info" }> }
  | { type: "select-payment"; methodId?: string }
  | { type: "validate-booking" }
  | { type: "request-confirmation" }
  | { type: "confirm-booking" }
  | { type: "abandon-booking" }
  | { type: "cancel-booking"; bookingId: string; confirmed: boolean }
  | {
      type: "modify-booking";
      bookingId: string;
      patch: { checkIn?: string; checkOut?: string; guests?: number; units?: number };
    }
  | { type: "clarify"; requirement?: AIBookingRequirement["key"] };

/**
 * A moment in the agent's run.
 *
 * Nothing streams today — the mock engine answers in one pass — but the
 * pipeline is written around this event union so a token-streaming provider can
 * be dropped in without the UI or the composer changing shape.
 */
export type AgentEvent =
  | { type: "start"; message: string }
  | { type: "intent"; intent: AIIntent }
  | { type: "plan"; actions: AgentAction[] }
  | { type: "tool_start"; tool: string; input?: unknown }
  | { type: "tool_result"; tool: string; ms: number; summary?: string }
  | { type: "tool_error"; tool: string; code: AIErrorCode; message: string }
  | { type: "progress"; label: string }
  | { type: "booking_state"; from: AIBookingState; to: AIBookingState }
  | { type: "block"; block: AIBlock }
  | { type: "message"; text: string }
  | { type: "complete"; ms: number; toolCalls: number }
  | { type: "error"; code: AIErrorCode; message: string };

/** Who is asking — decides whether booking actions are even offered. */
export interface AIAuthContext {
  authenticated: boolean;
  userId?: string;
  name?: string;
  email?: string;
  phone?: string;
}

/** Everything a provider needs to answer one turn. */
export interface AIRequest {
  /** The traveller's raw message. */
  message: string;
  /**
   * The structured action behind the message, when the UI raised one. Takes
   * precedence over parsing `message`.
   */
  action?: AIUserAction;
  /** Structured memory from earlier turns. */
  context: AITripContext;
  /** Where the assistant was opened from, if anywhere specific. */
  page?: AIPageContext;
  /** The signed-in traveller, if any. Booking requires one. */
  auth?: AIAuthContext;
  /**
   * Wall-clock milliseconds at send time, supplied by the caller. Used for
   * booking timestamps only; nothing in the engine reads the clock itself.
   */
  nowMs?: number;
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
  /** The actions the planner chose, for observability and tests. */
  actions?: AgentAction[];
  /** The visible progress trail for multi-step work. */
  steps?: AIProgressStep[];
  /** The booking state after this turn, when a booking is in flight. */
  bookingState?: AIBookingState;
  /** How many tools ran — surfaced in dev diagnostics and enforced by policy. */
  toolCalls?: number;
}

/** Optional per-turn hooks a provider honours. */
export interface AIRespondOptions {
  /** Receives agent events as they happen; today they arrive in one batch. */
  onEvent?: (event: AgentEvent) => void;
  /** Abort signal for a future networked provider. */
  signal?: AbortSignal;
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
  respond(request: AIRequest, options?: AIRespondOptions): Promise<AIResponse>;
}

export type {
  AIAvailabilityResult,
  AIBookingFailure,
  AIBookingQuote,
  AIBookingRecord,
  AIBookingRequirement,
  AIBookingSelection,
  AIBookingSession,
  AIBookingState,
  AIBookingSubject,
  AICancellationQuote,
  AIContactInformation,
  AIErrorCode,
  AIPaymentMethod,
  AIPaymentResult,
  AIPaymentSelection,
  AIPriceLine,
  AIRevalidation,
  AITravelerInfo,
} from "./ai-booking";
