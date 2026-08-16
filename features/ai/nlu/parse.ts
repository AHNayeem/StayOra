/**
 * Natural-language parsing for the mock engine.
 *
 * Turns a travel sentence into an {@link AIIntent} plus structured slots the
 * tools can consume — the same job an LLM would do when it decides which
 * function to call and with what arguments. Keeping it a pure function of
 * `(text, context, today)` means the whole engine is deterministic and testable,
 * and it never reads the clock itself.
 *
 * Nothing here fabricates travel facts: it only decides *what to ask the tools*.
 */

import type { AIIntent, AITravelers, AITripContext, AITripStyle } from "@/types/ai";
import type { ListingVertical } from "@/types/booking";
import type { CabinClass, TripType } from "@/types/flight";
import { addDays } from "@/lib/flight-time";
import { hasAny, hasPhrase, normalize } from "../lib/text";
import { findPlace, resolvePlace, type AIPlace } from "../lib/places";
import { extractContact, hasContactDetails, type ExtractedContact } from "./contact";
import { detectReference, isAffirmation, isNegation, type AIReference } from "./references";

/** What the assistant should try to include when it answers. */
export interface AIWants {
  flight: boolean;
  stay: boolean;
  activity: boolean;
  transport: boolean;
  tour: boolean;
  visa: boolean;
}

/** The parsed shape of one traveller message. */
export interface ParsedMessage {
  intent: AIIntent;
  /** Facts stated this turn — merged over the running context by the engine. */
  slots: AITripContext;
  origin?: AIPlace;
  destination?: AIPlace;
  wants: AIWants;
  /** How the traveller asked results to be ordered. */
  rank?: "cheapest" | "fastest" | "recommended";
  /** Explicit counts, e.g. "two activities". */
  counts: { activities?: number; results?: number };
  /** True when the message compares flights rather than stays. */
  compareFlights: boolean;
  /** Normalized text, exposed so the engine can do light follow-up checks. */
  text: string;

  /* --- conversational signals ---------------------------------------------- */

  /** How the traveller pointed at something already on screen. */
  reference?: AIReference;
  /** A bare "yes" / "confirm" — meaningful only against a pending question. */
  affirmation: boolean;
  /** A bare "no" / "stop". */
  negation: boolean;
  /** Contact facts stated in the message. */
  contact: ExtractedContact;
  /** How the traveller asked to change the previous answer. */
  refine?: AIRefinement;
  /** A booking reference the traveller named, e.g. "SO-4KX2P9". */
  bookingReference?: string;
  /**
   * True when the message contains an explicit booking verb. A bare reference
   * ("the second one") selects; only this starts the booking workflow.
   */
  explicitBooking: boolean;
}

/** A change to the previous answer rather than a fresh request. */
export interface AIRefinement {
  /** "cheaper", "show me better options", "something nicer". */
  direction?: "cheaper" | "better" | "more";
  /** "remove the hotel" — a component to drop from the current plan. */
  remove?: "flight" | "stay" | "activity" | "transport";
}

/* -------------------------------------------------------------------------- */
/* Vocabularies                                                                */
/* -------------------------------------------------------------------------- */

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, fourteen: 14, a: 1, an: 1, couple: 2,
};

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

const CABIN_WORDS: Array<[CabinClass, string[]]> = [
  ["first", ["first class", "first-class"]],
  ["business", ["business class", "business-class", "business"]],
  ["premium-economy", ["premium economy", "premium-economy", "premium"]],
  ["economy", ["economy", "coach"]],
];

const STYLE_WORDS: Array<[AITripStyle, string[]]> = [
  ["family", ["family", "family-friendly", "kids", "children", "with my kids"]],
  ["couple", ["couple", "romantic", "honeymoon", "my wife", "my husband", "my partner", "for two"]],
  ["solo", ["solo", "alone", "by myself"]],
  ["business", ["business trip", "work trip", "conference", "corporate"]],
  ["luxury", ["luxury", "luxurious", "5 star", "5-star", "five star", "premium", "upscale"]],
  ["budget", ["budget", "cheap", "cheapest", "affordable", "backpack", "hostel"]],
  ["beach", ["beach", "beachfront", "seaside", "sea view", "island", "coastal"]],
  ["adventure", ["adventure", "hiking", "diving", "safari", "trekking", "adventurous"]],
  ["culture", ["culture", "cultural", "history", "historical", "museum", "heritage"]],
  ["airport", ["near the airport", "airport", "close to the airport"]],
];

const STAY_VERTICAL_WORDS: Array<[ListingVertical, string[]]> = [
  ["resorts", ["resort", "resorts"]],
  ["apartments", ["apartment", "apartments", "flat", "airbnb", "whole home", "villa"]],
  ["shared-rooms", ["hostel", "hostels", "dorm", "dorms", "shared room", "shared rooms", "backpacker"]],
  ["hotels", ["hotel", "hotels", "room", "rooms", "stay", "stays", "accommodation", "place to stay"]],
];

const AMENITY_WORDS = [
  "pool", "spa", "gym", "wifi", "parking", "breakfast", "restaurant", "bar",
  "airport shuttle", "beachfront", "private beach", "kids club", "business center",
  "infinity pool", "rooftop", "kitchen", "yoga", "water sports",
];

/* -------------------------------------------------------------------------- */
/* Slot extraction                                                             */
/* -------------------------------------------------------------------------- */

/** Read a number written as digits or as a word. */
function readCount(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const digits = Number(raw.replace(/,/g, ""));
  if (Number.isFinite(digits)) return digits;
  return NUMBER_WORDS[raw];
}

/**
 * A money amount anywhere in the sentence. Accepts `$1,500`, `1500 usd`,
 * `1.5k` and `under 1500`. Returns base-USD, matching how every price in the
 * platform is stored.
 */
function extractMoney(text: string): { budget?: number; nightly?: number } {
  const perNight = /(?:\$\s?)?([\d][\d,]*(?:\.\d+)?)\s?(k)?\s*(?:usd|dollars?)?\s*(?:per|a|\/)\s*(?:night|nights)/;
  const nightlyMatch = text.match(perNight);

  const general =
    /(?:under|below|less than|max(?:imum)?|within|budget(?: of| is)?|around|about|up to|no more than)\s*(?:\$\s?)?([\d][\d,]*(?:\.\d+)?)\s?(k)?/;
  const dollar = /\$\s?([\d][\d,]*(?:\.\d+)?)\s?(k)?/;

  const scale = (value: number, k?: string) => (k ? value * 1000 : value);

  let nightly: number | undefined;
  if (nightlyMatch) {
    nightly = scale(Number(nightlyMatch[1].replace(/,/g, "")), nightlyMatch[2]);
  }

  const match = text.match(general) ?? text.match(dollar);
  let budget: number | undefined;
  if (match) budget = scale(Number(match[1].replace(/,/g, "")), match[2]);

  // "hotels under $150" is a nightly ceiling, not a trip budget: a stay word
  // next to the amount disambiguates without needing the whole sentence.
  if (budget !== undefined && nightly === undefined) {
    const staysContext = hasAny(text, ["hotel", "hotels", "room", "night", "stay", "resort", "apartment", "hostel"]);
    const tripContext = hasAny(text, ["trip", "budget", "total", "holiday", "vacation", "everything", "all in"]);
    if (staysContext && !tripContext) {
      nightly = budget;
      budget = undefined;
    }
  }

  return { budget, nightly };
}

/** Trip length in nights, from "5 days", "a week", "3 nights", "weekend". */
function extractNights(text: string): number | undefined {
  const nights = text.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fourteen)[\s-]*nights?/);
  if (nights) return readCount(nights[1]);

  const days = text.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fourteen)[\s-]*days?/);
  // "5-day trip" means 5 days on the ground → 4 nights of accommodation is the
  // pedantic reading, but travellers mean "five days away", so keep it simple
  // and treat days as nights minus the departure day.
  if (days) {
    const count = readCount(days[1]);
    if (count !== undefined) return Math.max(1, count - 1);
  }

  if (hasAny(text, ["weekend", "long weekend"])) return 2;
  // Only a *quantified* week is a duration — "next week" is a date, not a length.
  const weeks = text.match(/\b(\d+|a|one|two|three)\s+weeks?\b/);
  if (weeks) return (readCount(weeks[1]) ?? 1) * 7;
  return undefined;
}

/** Party size, from explicit counts or from relationship words. */
function extractTravelers(text: string): AITravelers | undefined {
  const adultsMatch = text.match(
    /(\d+|one|two|three|four|five|six|seven|eight|nine)\s*(?:adults?|people|persons?|travell?ers?|guests?|passengers?|of us)/,
  );
  const childrenMatch = text.match(/(\d+|one|two|three|four|five|six)\s*(?:kids?|children|child)/);

  const adults = readCount(adultsMatch?.[1]);
  const children = readCount(childrenMatch?.[1]);

  if (adults !== undefined || children !== undefined) {
    return { adults: Math.max(1, adults ?? 1), children: children ?? 0 };
  }

  if (hasAny(text, ["my wife", "my husband", "my partner", "couple", "romantic", "honeymoon", "for two", "girlfriend", "boyfriend"])) {
    return { adults: 2, children: 0 };
  }
  if (hasAny(text, ["family"])) return { adults: 2, children: 2 };
  if (hasAny(text, ["solo", "alone", "by myself", "just me"])) return { adults: 1, children: 0 };
  return undefined;
}

/** Minimum star / review rating asked for. */
function extractRating(text: string): number | undefined {
  const stars = text.match(/(\d)\s*(?:\+)?\s*(?:star|stars)/);
  if (stars) return Number(stars[1]);
  if (hasAny(text, ["highly rated", "top rated", "best rated", "well reviewed"])) return 4.5;
  return undefined;
}

/**
 * A departure date, resolved against `today`. Only forms travellers actually
 * type are handled; anything unrecognised leaves the date open, and the flight
 * tool then uses its own documented default rather than inventing a specific
 * day and presenting it as the traveller's choice.
 */
function extractStartDate(text: string, today: string): string | undefined {
  const iso = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];

  if (hasPhrase(text, "tomorrow")) return addDays(today, 1);
  if (hasAny(text, ["next week"])) return addDays(today, 7);
  if (hasAny(text, ["next month"])) return addDays(today, 30);
  if (hasAny(text, ["this weekend"])) return nextWeekday(today, 6);
  if (hasAny(text, ["next weekend"])) return addDays(nextWeekday(today, 6), 7);

  // "in July", "on 12 August", "august 12". "May" is also an everyday verb, so
  // it only counts as a month when a date-shaped context surrounds it.
  const monthIndex = MONTHS.findIndex((m) =>
    m === "may"
      ? /\bin may\b|\bmay \d{1,2}\b|\b\d{1,2}(?:st|nd|rd|th)? may\b/.test(text)
      : hasPhrase(text, m),
  );
  if (monthIndex >= 0) {
    const dayMatch =
      text.match(new RegExp(`(\\d{1,2})\\s*(?:st|nd|rd|th)?\\s+${MONTHS[monthIndex]}`)) ??
      text.match(new RegExp(`${MONTHS[monthIndex]}\\s+(\\d{1,2})`));
    const day = dayMatch ? Number(dayMatch[1]) : 10;
    return nextDateOf(today, monthIndex, Math.min(28, Math.max(1, day)));
  }
  return undefined;
}

/** The next occurrence of a weekday (0 = Sunday) strictly after today. */
function nextWeekday(today: string, weekday: number): string {
  const current = new Date(`${today}T00:00:00Z`).getUTCDay();
  const delta = ((weekday - current + 7) % 7) || 7;
  return addDays(today, delta);
}

/** The next occurrence of month/day at or after today. */
function nextDateOf(today: string, monthIndex: number, day: number): string {
  const [year] = today.split("-").map(Number);
  const candidate = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (candidate >= today) return candidate;
  return `${year + 1}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Origin and destination.
 *
 * "from X to Y" is read first because it is unambiguous; otherwise a single
 * place after "to"/"in"/"visit" is the destination. Both are resolved against
 * the catalog + airport vocabulary, so an unknown city simply doesn't match
 * rather than becoming a made-up destination.
 */
function extractPlaces(raw: string): { origin?: AIPlace; destination?: AIPlace } {
  const text = normalize(raw);
  const look = (fragment: string) => resolvePlace(fragment) ?? findPlace(fragment);

  // 1. "from X to Y" — unambiguous, so it wins outright.
  const fromTo = text.match(/\bfrom\s+(.{2,40}?)\s+to\s+(.{2,40}?)(?:$|[,.]|\s+(?:for|on|in|next|this|with|under|and|departing|leaving|returning)\b)/);
  if (fromTo) {
    const origin = look(fromTo[1]);
    const destination = look(fromTo[2]);
    if (origin || destination) return { origin, destination: destination ?? undefined };
  }

  // 2. Bare IATA pair, e.g. "DAC to DXB".
  const codes = raw.match(/\b([A-Z]{3})\s+to\s+([A-Z]{3})\b/);
  if (codes) {
    const origin = resolvePlace(codes[1]);
    const destination = resolvePlace(codes[2]);
    if (origin && destination) return { origin, destination };
  }

  // 3. "<place> to <place>" with no "from" — accepted only when *both* sides
  //    resolve, so "I want to go to Dubai" can't turn "go" into an origin.
  for (const index of allIndexesOf(text, " to ")) {
    const origin = look(text.slice(0, index));
    const destination = look(text.slice(index + 4));
    if (origin && destination && keyOf(origin) !== keyOf(destination)) {
      return { origin, destination };
    }
  }

  // 4. A single destination, preferring one introduced by a preposition.
  const prepositional = text.match(
    /\b(?:to|in|at|visit|visiting|explore|exploring|around|near)\s+(.{2,40}?)(?:$|[,.]|\s+(?:for|under|with|next|this|on|from|and|near|between)\b)/,
  );
  const destination = (prepositional ? look(prepositional[1]) : undefined) ?? findPlace(raw);

  // 5. An origin only exists here if the sentence framed it with "from".
  const fromOnly = text.match(/\bfrom\s+(.{2,40}?)(?:$|[,.]|\s+(?:to|for|on|in|next|this|with|and)\b)/);
  const origin = fromOnly ? look(fromOnly[1]) : undefined;

  return {
    origin: origin && keyOf(origin) !== keyOf(destination) ? origin : undefined,
    destination,
  };
}

/** Identity of a place for de-duplication. */
function keyOf(place?: AIPlace): string {
  return place ? normalize(place.city ?? place.label) : "";
}

/** Every start index of `needle` in `haystack`. */
function allIndexesOf(haystack: string, needle: string): number[] {
  const found: number[] = [];
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    found.push(index);
    index = haystack.indexOf(needle, index + 1);
  }
  return found;
}

/* -------------------------------------------------------------------------- */
/* Intent classification                                                       */
/* -------------------------------------------------------------------------- */

const GREETING_WORDS = ["hi", "hello", "hey", "salam", "assalamu alaikum", "good morning", "good evening", "hola"];
const HELP_WORDS = ["help", "what can you do", "how does this work", "who are you", "what do you do"];
const BOOKINGS_WORDS = [
  "my booking", "my bookings", "my trip", "my trips", "my reservation", "my reservations",
  "my flight", "my flights", "my next trip", "upcoming trip", "my itinerary", "my stay",
  "cancel my", "show my", "my hotel booking",
];
const PLAN_WORDS = ["plan", "planning", "itinerary", "trip to", "holiday", "vacation", "honeymoon", "getaway", "build me", "organise", "organize"];
const COMPARE_WORDS = ["compare", "which is better", "which one", "versus", "vs", "difference between", "help me choose", "which should i"];
const REVIEW_WORDS = ["review", "reviews", "what do people say", "why do people like", "guest feedback"];
const FLIGHT_WORDS = [
  "flight", "flights", "fly", "flying", "airfare", "airline", "non stop", "nonstop",
  "direct flight", "round trip", "one way", "layover", "stopover", "airport to",
  // A cabin on its own is a flight request: "Business class Dhaka to London".
  "business class", "first class", "premium economy", "economy class", "cabin class",
];
const STAY_WORDS = ["hotel", "hotels", "stay", "stays", "room", "rooms", "resort", "resorts", "apartment", "apartments", "hostel", "accommodation", "place to stay", "where to stay"];
const ACTIVITY_WORDS = ["activity", "activities", "things to do", "thing to do", "experience", "experiences", "attraction", "attractions", "excursion", "what to do"];
const TOUR_WORDS = ["tour", "tours", "package", "packages", "guided trip"];
const TRANSPORT_WORDS = ["transfer", "transfers", "transport", "taxi", "pickup", "pick up", "shuttle", "car rental", "airport transfer"];
const VISA_WORDS = ["visa", "visas", "entry requirement", "entry requirements", "do i need a visa", "documents required", "what documents"];
const BUDGET_WORDS = [
  "budget", "how much", "total cost", "cost breakdown", "afford", "spend",
  "cheaper", "save money", "over budget", "keep it under", "bring it down",
];
const BOOK_WORDS = [
  "book this", "book it", "book now", "reserve this", "reserve it", "i want to book",
  "book the", "make a booking", "booking draft", "book that", "reserve the", "reserve a",
  "go ahead with", "ill take", "i will take", "lets book", "let us book", "take this one",
  "book me", "secure this", "grab this one",
];
/** Cancelling something that already exists — never the in-flight booking. */
const CANCEL_WORDS = [
  "cancel my booking", "cancel my reservation", "cancel my trip", "cancel booking",
  "cancel the booking", "i want to cancel", "cancel my stay", "refund my booking",
];
/** Changing an existing booking. */
const MODIFY_WORDS = [
  "change my booking", "modify my booking", "move my booking", "change my dates",
  "reschedule", "push my booking", "change the guests on", "amend my booking",
];
const RECOMMEND_WORDS = ["recommend", "suggest", "suggestion", "suggestions", "ideas", "inspire", "where should i", "surprise me"];
const ITINERARY_WORDS = ["itinerary", "day by day", "day-by-day", "schedule", "day plan"];

/**
 * Classify the message. Order encodes precedence: a sentence that both names a
 * destination *and* asks for several components is a plan, not a hotel search,
 * so the composite intents are tested before the single-vertical ones.
 */
function classify(
  text: string,
  wants: AIWants,
  slots: AITripContext,
  destination: AIPlace | undefined,
  context: AITripContext,
  rank: ParsedMessage["rank"],
  origin: AIPlace | undefined,
  signals: {
    affirmation: boolean;
    negation: boolean;
    contact: ExtractedContact;
    reference?: AIReference;
    refine?: AIRefinement;
  },
): AIIntent {
  if (!text) return "unknown";

  /* --- a booking in flight owns the conversation --------------------------- */
  // While a booking is open, short answers mean something specific. Reading
  // "yes" as a greeting there would be the single most expensive misparse in
  // the product, so this block is tested before anything else.
  const booking = context.booking;
  const bookingActive =
    booking && booking.state !== "confirmed" && booking.state !== "cancelled";

  if (bookingActive) {
    if (signals.affirmation) return "confirm-booking";
    if (signals.negation) return "modify-booking";
    if (hasContactDetails(signals.contact)) return "provide-info";
  }

  if (hasAny(text, HELP_WORDS)) return "help";
  if (text.split(" ").length <= 3 && hasAny(text, GREETING_WORDS)) return "greet";

  if (hasAny(text, CANCEL_WORDS)) return "cancel-booking";
  if (hasAny(text, MODIFY_WORDS)) return "modify-booking";
  if (hasAny(text, BOOKINGS_WORDS)) return "my-bookings";
  if (hasAny(text, BOOK_WORDS)) return "start-booking";
  if (hasAny(text, REVIEW_WORDS)) return "summarize-reviews";
  if (hasAny(text, COMPARE_WORDS)) return "compare";
  if (hasAny(text, VISA_WORDS)) return "search-visa";

  // "Remove the hotel" names a component, so it reads as a stay search unless
  // the plan it belongs to is checked first. The plan wins: dropping a piece of
  // an existing itinerary is an edit, not a new search.
  if (signals.refine?.remove && context.planId) return "plan-trip";

  const wantCount = Object.values(wants).filter(Boolean).length;
  const isPlan =
    hasAny(text, PLAN_WORDS) ||
    (Boolean(destination ?? context.destination) && slots.nights !== undefined && wantCount >= 1) ||
    wantCount >= 3;
  if (isPlan && !hasAny(text, ITINERARY_WORDS)) return "plan-trip";

  if (hasAny(text, ITINERARY_WORDS)) return context.planId ? "itinerary" : "plan-trip";

  // A budget statement becomes the optimiser only once there is a plan to cost
  // ("keep it under $1,000"); otherwise "hotels under $150" is a filtered search.
  const budgetAsk = hasAny(text, BUDGET_WORDS) || slots.budgetUsd !== undefined;
  if (budgetAsk && context.planId && wantCount === 0) return "budget";

  if (wants.flight) return "search-flights";
  if (wants.stay) return "search-hotels";
  if (wants.tour) return "search-tours";
  if (wants.activity) return "search-activities";
  if (wants.transport) return "search-transport";

  // A bare route ("Dhaka to London") is a flight ask even without the word.
  if (origin && destination) return "search-flights";

  // "Show me cheaper ones" / "any better options?" — a change to the last
  // answer, not a new question. Only meaningful when there *was* a last answer.
  if (signals.refine && context.lastResults?.items.length) return "refine";

  // A bare ranking follow-up ("what's the fastest option?") re-runs the last
  // search rather than dead-ending — the conversation already said what about.
  if (rank) {
    if ((context.selectedOfferIds?.length ?? 0) > 0) return "search-flights";
    if ((context.selectedListingIds?.length ?? 0) > 0) return "search-hotels";
  }

  if (hasAny(text, RECOMMEND_WORDS)) return "recommend";

  // A bare reference with no verb ("the second one") selects rather than books —
  // the planner turns this into a selection, and booking stays an explicit act.
  if (signals.reference && context.lastResults?.items.length) return "start-booking";

  // Contact details offered out of the blue are still worth keeping.
  if (hasContactDetails(signals.contact)) return "provide-info";

  // "I want to visit Dubai" — a destination with no ask is context, not a search.
  if (destination) return "set-context";
  return "unknown";
}

/* -------------------------------------------------------------------------- */
/* Entry point                                                                 */
/* -------------------------------------------------------------------------- */

export interface ParseOptions {
  /** Running conversation memory — resolves pronouns like "there" and "it". */
  context: AITripContext;
  /** Today's date, ISO `YYYY-MM-DD`. */
  today: string;
}

/** Parse one traveller message into an intent plus slots. */
export function parseMessage(raw: string, options: ParseOptions): ParsedMessage {
  const text = normalize(raw);
  const { context, today } = options;

  const { origin, destination } = extractPlaces(raw);
  const { budget, nightly } = extractMoney(text);
  const nights = extractNights(text);
  const travelers = extractTravelers(text);
  const minRating = extractRating(text);
  const startDate = extractStartDate(text, today);

  const cabin = CABIN_WORDS.find(([, words]) => hasAny(text, words))?.[0];
  const stayVertical = STAY_VERTICAL_WORDS.find(([, words]) => hasAny(text, words))?.[0];
  const styles = STYLE_WORDS.filter(([, words]) => hasAny(text, words)).map(([style]) => style);
  const amenities = AMENITY_WORDS.filter((word) => hasPhrase(text, word));

  const tripType: TripType | undefined = hasAny(text, [
    "round trip", "round-trip", "roundtrip", "return flight", "returning", "and back",
  ])
    ? "round-trip"
    : hasAny(text, ["one way", "one-way"])
      ? "one-way"
      : hasAny(text, ["multi city", "multi-city", "multiple cities"])
        ? "multi-city"
        : undefined;

  const directOnly = hasAny(text, ["direct", "non stop", "nonstop", "no layover", "no stops"]) || undefined;

  const wants: AIWants = {
    flight: hasAny(text, FLIGHT_WORDS),
    stay: hasAny(text, STAY_WORDS),
    activity: hasAny(text, ACTIVITY_WORDS),
    transport: hasAny(text, TRANSPORT_WORDS),
    tour: hasAny(text, TOUR_WORDS),
    visa: hasAny(text, VISA_WORDS),
  };

  const rank = hasAny(text, ["cheapest", "cheap", "lowest price", "budget", "save money"])
    ? ("cheapest" as const)
    : hasAny(text, ["fastest", "quickest", "shortest", "quick"])
      ? ("fastest" as const)
      : undefined;

  const activityCountMatch = text.match(
    /(\d+|one|two|three|four|five)\s*(?:activit|thing|experience|excursion)/,
  );

  /* --- conversational signals --------------------------------------------- */
  const reference = detectReference(raw);
  const contact = extractContact(raw);
  const affirmation = isAffirmation(raw);
  const negation = isNegation(raw);
  const refine = extractRefinement(text);
  const bookingReference = raw.match(/\b(SO-[A-Z0-9]{4,10})\b/i)?.[1]?.toUpperCase();
  const explicitBooking = hasAny(text, BOOK_WORDS);

  const slots: AITripContext = {
    ...(destination
      ? {
          destination: destination.label,
          destinationCity: destination.city,
          destinationCountry: destination.country,
          destinationCode: destination.airportCode,
        }
      : {}),
    ...(origin?.airportCode ? { originCode: origin.airportCode } : {}),
    ...(startDate ? { startDate } : {}),
    ...(nights !== undefined ? { nights } : {}),
    ...(travelers ? { travelers } : {}),
    ...(budget !== undefined ? { budgetUsd: budget } : {}),
    ...(nightly !== undefined ? { maxNightlyUsd: nightly } : {}),
    ...(cabin ? { cabin } : {}),
    ...(tripType ? { tripType } : {}),
    ...(directOnly ? { directOnly } : {}),
    ...(styles.length ? { styles } : {}),
    ...(amenities.length ? { amenities } : {}),
    ...(stayVertical && wants.stay ? { stayVertical } : {}),
    ...(minRating !== undefined ? { minRating } : {}),
  };

  if (slots.startDate && slots.nights !== undefined) {
    slots.endDate = addDays(slots.startDate, slots.nights);
  }

  const intent = classify(text, wants, slots, destination, context, rank, origin, {
    affirmation,
    negation,
    contact,
    reference,
    refine,
  });

  return {
    intent,
    slots,
    origin,
    destination,
    wants,
    rank,
    counts: {
      activities: readCount(activityCountMatch?.[1]),
    },
    compareFlights:
      wants.flight ||
      (!wants.stay && (context.selectedOfferIds?.length ?? 0) >= 2),
    text,
    reference,
    affirmation,
    negation,
    contact,
    refine,
    bookingReference,
    explicitBooking,
  };
}

/**
 * "Cheaper", "better options", "remove the hotel" — a change to the last answer.
 *
 * Only the *direction* is parsed here. What "cheaper" means numerically depends
 * on what was shown, which is the agent's job with the result set in hand.
 */
function extractRefinement(text: string): AIRefinement | undefined {
  const direction = hasAny(text, ["cheaper", "less expensive", "lower price", "cheapest option"])
    ? ("cheaper" as const)
    : hasAny(text, ["better options", "better ones", "nicer", "something nicer", "upgrade", "show me better"])
      ? ("better" as const)
      : hasAny(text, ["show more", "more options", "other options", "something else", "different ones", "show me others"])
        ? ("more" as const)
        : undefined;

  const remove = hasAny(text, ["remove the hotel", "without the hotel", "no hotel", "drop the hotel"])
    ? ("stay" as const)
    : hasAny(text, ["remove the flight", "without flights", "no flight", "drop the flight", "without the flight"])
      ? ("flight" as const)
      : hasAny(text, ["remove the activities", "no activities", "without activities", "drop the activities"])
        ? ("activity" as const)
        : hasAny(text, ["remove the transfer", "no transfer", "without transfers", "drop the transfer"])
          ? ("transport" as const)
          : undefined;

  if (!direction && !remove) return undefined;
  return { direction, remove };
}
