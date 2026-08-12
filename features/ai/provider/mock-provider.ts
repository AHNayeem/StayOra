/**
 * MockAIProvider — the deterministic engine behind the prototype.
 *
 * It does the same three jobs a real LLM provider would do, in the same order:
 *
 *   1. understand the message  → {@link parseMessage}
 *   2. choose and call tools   → {@link AI_TOOLS}
 *   3. compose a response      → text + {@link AIBlock}s + follow-up chips
 *
 * The important property is what it *cannot* do: it has no access to listings,
 * fares or bookings except through the tool barrel, so no price, availability
 * or policy in an answer can be anything other than what Otithee's own services
 * returned. Swapping this class for an LLM-backed one keeps that guarantee as
 * long as the LLM is likewise only given these tools.
 */

import type {
  AIBlock,
  AIListingRef,
  AIProvider,
  AIRequest,
  AIResponse,
  AITravelers,
  AITripContext,
  AITripPlan,
} from "@/types/ai";
import type { ListingVertical } from "@/types/booking";
import { AI_TOOLS } from "../tools";
import { defaultOriginCode, resolvePlace, type AIPlace } from "../lib/places";
import { usd } from "../lib/money";
import { listSentence } from "../lib/text";
import { parseMessage, type ParsedMessage } from "../nlu/parse";

/** Default party when the traveller hasn't said. */
const SOLO: AITravelers = { adults: 1, children: 0 };
/** Default trip length used when planning without a stated duration. */
const DEFAULT_NIGHTS = 4;

export class MockAIProvider implements AIProvider {
  readonly id = "mock";
  readonly label = "Otithee Mock Engine";

  async respond(request: AIRequest): Promise<AIResponse> {
    const parsed = parseMessage(request.message, {
      context: request.context,
      today: request.today,
    });

    // The running memory, with this turn's facts and the current page's subject
    // folded in. Everything downstream reads from here, never from the raw text.
    const context = mergeContext(request, parsed);

    switch (parsed.intent) {
      case "greet":
        return greet(context, parsed);
      case "help":
        return help(context, parsed);
      case "set-context":
        return await setContext(context, parsed);
      case "search-hotels":
        return await searchStays(context, parsed);
      case "search-flights":
        return await searchFlights(context, parsed, request);
      case "search-tours":
        return await searchExperiences(context, parsed, "tours");
      case "search-activities":
        return await searchExperiences(context, parsed, "activities");
      case "search-transport":
        return await searchExperiences(context, parsed, "transport");
      case "search-visa":
        return await visa(context, parsed, request);
      case "compare":
        return await compare(context, parsed);
      case "plan-trip":
        return await planTrip(context, parsed, request);
      case "itinerary":
        return await planTrip(context, parsed, request, "itinerary");
      case "budget":
        return await planTrip(context, parsed, request, "budget");
      case "my-bookings":
        return await bookings(context, parsed);
      case "booking-draft":
        return await bookingDraft(context, parsed, request);
      case "summarize-reviews":
        return await reviews(context, parsed);
      case "recommend":
        return await recommend(context, parsed);
      default:
        return fallback(context, parsed);
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Context                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Fold the page's subject and this turn's slots into the running memory.
 *
 * Page context is the *weakest* source (a traveller viewing a Bali hotel who
 * asks about Tokyo means Tokyo), so it is applied first and the parsed slots
 * overwrite it.
 */
function mergeContext(request: AIRequest, parsed: ParsedMessage): AITripContext {
  const next: AITripContext = { ...request.context };
  const page = request.page;

  if (page?.destination && !next.destination) {
    const place = resolvePlace(page.destination);
    if (place) applyPlace(next, place);
  }
  if (page?.listing?.destination && !next.destination) {
    const place = resolvePlace(page.listing.destination.split(",")[0].trim());
    if (place) applyPlace(next, place);
  }
  if (page?.originCode && !next.originCode) next.originCode = page.originCode;

  Object.assign(next, parsed.slots);

  if (!next.originCode) {
    next.originCode = defaultOriginCode(request.countryCode);
  }
  if (!next.travelers) next.travelers = SOLO;
  return next;
}

function applyPlace(context: AITripContext, place: AIPlace): void {
  context.destination = place.label;
  context.destinationCity = place.city;
  context.destinationCountry = place.country;
  context.destinationCode = place.airportCode;
}

/** Rebuild an {@link AIPlace} from the context so tools can filter on it. */
function placeOf(context: AITripContext): AIPlace | undefined {
  if (!context.destination) return undefined;
  return (
    resolvePlace(context.destinationCity ?? context.destination) ?? {
      label: context.destination,
      city: context.destinationCity,
      country: context.destinationCountry,
      airportCode: context.destinationCode,
      scope: context.destinationCity ? "city" : "country",
    }
  );
}

/** Record what was shown, so "compare these" and "book it" have a subject. */
function remember(patch: AITripContext, listings: AIListingRef[] = [], offerIds: string[] = []) {
  if (listings.length) patch.selectedListingIds = listings.map((l) => l.listing.id);
  if (offerIds.length) patch.selectedOfferIds = offerIds;
  return patch;
}

/** The party size to plan for. */
function partyOf(context: AITripContext): AITravelers {
  return context.travelers ?? SOLO;
}

function partySize(travelers: AITravelers): number {
  return Math.max(1, travelers.adults + travelers.children);
}

/** "2 adults and 1 child" — used in answers so assumptions are always visible. */
function describeParty(travelers: AITravelers): string {
  const parts = [`${travelers.adults} adult${travelers.adults > 1 ? "s" : ""}`];
  if (travelers.children > 0) {
    parts.push(`${travelers.children} child${travelers.children > 1 ? "ren" : ""}`);
  }
  return listSentence(parts);
}

/** A sentence naming any constraint the search had to drop. */
function relaxedNote(relaxed: string[]): string | undefined {
  if (relaxed.length === 0) return undefined;
  return `I couldn't match ${listSentence(relaxed, "or")} exactly, so these are the closest real matches.`;
}

/**
 * Whether the destination itself had to be abandoned.
 *
 * This is the one relaxation that must never be papered over: results from
 * another city answer a different question, and saying "5 stays in Dubai" over
 * a list of Vienna hotels is exactly the kind of confident wrongness this
 * assistant is built to avoid.
 */
function missedPlace(relaxed: string[]): boolean {
  return relaxed.some((entry) => entry.startsWith("destination "));
}

/* -------------------------------------------------------------------------- */
/* Conversational intents                                                      */
/* -------------------------------------------------------------------------- */

const STARTER_CHIPS = [
  "Plan my next trip",
  "Find the cheapest flight",
  "Find a family hotel",
  "Build a 7-day itinerary",
  "Help me plan within my budget",
];

function greet(context: AITripContext, parsed: ParsedMessage): AIResponse {
  return {
    text: context.destination
      ? `Hi! We were talking about ${context.destination} — want me to pick up from there?`
      : "Hi! I'm the Otithee travel concierge. Tell me where you'd like to go, who's coming and roughly what you want to spend, and I'll put a real trip together from our live inventory.",
    blocks: [],
    suggestions: STARTER_CHIPS,
    contextPatch: context,
    intent: parsed.intent,
  };
}

function help(context: AITripContext, parsed: ParsedMessage): AIResponse {
  return {
    text: "I search Otithee's own inventory — I never make prices up. I can find flights and stays, compare options side by side, build a day-by-day itinerary, cost it against your budget, look up your existing bookings, and prepare a booking for you to confirm.",
    blocks: [
      {
        kind: "facts",
        title: "What I can do",
        items: [
          { label: "Search", value: "Flights, hotels, resorts, apartments, tours, activities, transfers, visas" },
          { label: "Compare", value: "Any two to four stays or fares, side by side" },
          { label: "Plan", value: "Day-by-day itineraries with real prices" },
          { label: "Budget", value: "Costed against your number, with cheaper real alternatives" },
          { label: "Your trips", value: "Bookings, references, what's next" },
          { label: "Booking", value: "I prepare it — you always confirm and pay yourself" },
        ],
      },
    ],
    suggestions: STARTER_CHIPS,
    contextPatch: context,
    intent: parsed.intent,
  };
}

function fallback(context: AITripContext, parsed: ParsedMessage): AIResponse {
  return {
    text: context.destination
      ? `I didn't quite catch that. For ${context.destination} I can find flights, stays, things to do, or build a full plan — which would you like?`
      : "I didn't quite catch that. Try naming a destination — for example “hotels in Bali under $150” or “plan a 5-day Dubai trip”.",
    blocks: [],
    suggestions: context.destination
      ? [
          `Find hotels in ${context.destination}`,
          `Things to do in ${context.destination}`,
          `Plan a trip to ${context.destination}`,
        ]
      : STARTER_CHIPS,
    contextPatch: context,
    intent: parsed.intent,
  };
}

/** "I want to visit Dubai." — remember it, and show what's there. */
async function setContext(context: AITripContext, parsed: ParsedMessage): Promise<AIResponse> {
  const place = placeOf(context);
  if (!place) return fallback(context, parsed);

  const result = await AI_TOOLS.getRecommendations({
    place,
    styles: context.styles,
    limit: 4,
  });

  const patch = remember({ ...context }, result.items);
  return {
    text: `${place.label} — noted. Here's what our travellers book most there. Tell me your dates and budget and I'll build the whole trip.`,
    blocks: result.items.length
      ? [
          {
            kind: "listings",
            title: `Popular in ${place.label}`,
            note: relaxedNote(result.relaxed),
            vertical: result.items[0].listing.vertical as ListingVertical,
            items: result.items,
            comparable: result.items.length >= 2,
          },
        ]
      : [
          {
            kind: "notice",
            tone: "info",
            text: `I don't have inventory in ${place.label} yet — try a nearby city, or ask me for ideas.`,
          },
        ],
    suggestions: [
      `Find hotels in ${place.label}`,
      `Flights to ${place.label}`,
      `Plan a 5-day trip to ${place.label}`,
      `Things to do in ${place.label}`,
    ],
    contextPatch: patch,
    intent: parsed.intent,
  };
}

/* -------------------------------------------------------------------------- */
/* Search intents                                                              */
/* -------------------------------------------------------------------------- */

async function searchStays(context: AITripContext, parsed: ParsedMessage): Promise<AIResponse> {
  const place = placeOf(context);
  const nights = context.nights;

  const result = await AI_TOOLS.searchHotels({
    place,
    maxNightlyUsd: context.maxNightlyUsd,
    minRating: context.minRating,
    amenities: context.amenities,
    vertical: context.stayVertical,
    styles: context.styles,
    nights,
    limit: 3,
  });

  if (result.items.length === 0) {
    return {
      text: place
        ? `I couldn't find any stays in ${place.label} in our inventory. Want me to look at a nearby city?`
        : "Which destination should I search? Name a city or country and I'll pull real options.",
      blocks: [],
      suggestions: ["Hotels in Bali under $150", "Beach resorts in Cox's Bazar", "Family-friendly hotels in Bangkok"],
      contextPatch: context,
      intent: parsed.intent,
    };
  }

  const cheapest = result.items.reduce((best, item) =>
    item.listing.price.amount < best.listing.price.amount ? item : best,
  );

  // Only claim a filter that actually held. `relaxed` tells us which ones didn't.
  const dropped = new Set(result.relaxed);
  const honoured = (constraint: string, phrase: string) =>
    dropped.has(constraint) ? "" : phrase;

  const placeMissed = missedPlace(result.relaxed);
  const qualifiers = [
    context.maxNightlyUsd !== undefined
      ? honoured(
          `budget under ${usd(context.maxNightlyUsd)} a night`,
          `under ${usd(context.maxNightlyUsd)} a night`,
        )
      : "",
    context.minRating !== undefined
      ? honoured(`${context.minRating}+ rating`, `rated ${context.minRating}+`)
      : "",
    context.amenities?.length ? `with ${listSentence(context.amenities)}` : "",
    context.styles?.length ? `good for ${listSentence(context.styles.map(styleLabel))}` : "",
  ].filter(Boolean);

  // Say plainly what couldn't be met, rather than leaving it to the small print.
  const unmet = result.relaxed.filter((entry) => !entry.startsWith("destination "));
  const shortfall = unmet.length
    ? ` Nothing there matched ${listSentence(unmet, "or")}, so this is as close as the inventory gets.`
    : "";

  const where = result.widenedTo
    ? ` elsewhere in ${result.widenedTo}`
    : place
      ? ` in ${place.label}`
      : "";
  const widenNote = result.widenedTo
    ? `I don't have anything in ${place?.label} itself, so I've looked across ${result.widenedTo}. `
    : "";

  const text = placeMissed
    ? `I don't have any stays listed in ${place?.label} yet. Here are the closest real matches elsewhere — or name another city and I'll look again.`
    : `${widenNote}${result.total} stay${result.total === 1 ? "" : "s"}${where}${
        qualifiers.length ? ` ${listSentence(qualifiers)}` : ""
      }. The lowest rate here is ${usd(cheapest.listing.price.amount)} a night at ${cheapest.listing.title}.${shortfall}`;

  const patch = remember({ ...context }, result.items);
  return {
    text,
    blocks: [
      {
        kind: "listings",
        title: place ? `Stays in ${place.label}` : "Stays for you",
        note: relaxedNote(result.relaxed),
        vertical: result.items[0].listing.vertical as ListingVertical,
        items: result.items,
        moreHref: searchLink(place?.label ?? ""),
        comparable: result.items.length >= 2,
      },
    ],
    suggestions: [
      "Compare these",
      result.items[0] ? `Summarize reviews for ${result.items[0].listing.title}` : "Show cheaper options",
      place ? `Things to do in ${place.label}` : "Show me activities",
      place ? `Plan a trip to ${place.label}` : "Plan my trip",
    ],
    contextPatch: patch,
    intent: parsed.intent,
  };
}

async function searchFlights(
  context: AITripContext,
  parsed: ParsedMessage,
  request: AIRequest,
): Promise<AIResponse> {
  const place = placeOf(context);
  const destinationCode = context.destinationCode ?? place?.airportCode;

  if (!destinationCode) {
    return {
      text: "Where would you like to fly to? Give me a city or airport and I'll pull live fares.",
      blocks: [],
      suggestions: ["Cheap flights from Dhaka to Dubai", "Business class Dhaka to London", "Flights to Bangkok"],
      contextPatch: context,
      intent: parsed.intent,
    };
  }
  if (!context.originCode) {
    return {
      text: `And where are you flying from? Once I have an origin I'll search fares to ${place?.label ?? destinationCode}.`,
      blocks: [],
      suggestions: ["From Dhaka", "From London", "From Dubai"],
      contextPatch: context,
      intent: parsed.intent,
    };
  }

  const result = await AI_TOOLS.searchFlights({
    originCode: context.originCode,
    destinationCode,
    startDate: context.startDate,
    endDate: context.endDate,
    cabin: context.cabin,
    tripType: context.tripType,
    travelers: partyOf(context),
    directOnly: context.directOnly,
    rank: parsed.rank ?? (context.budgetUsd ? "cheapest" : "recommended"),
    maxTotalUsd: context.budgetUsd,
    limit: 3,
    today: request.today,
  });

  if (result.items.length === 0) {
    return {
      text: `No fares came back for ${context.originCode} → ${destinationCode} on that date. Try different dates, or I can check a nearby airport.`,
      blocks: [],
      suggestions: ["Try next month", "Show direct flights only", "Change my dates"],
      contextPatch: context,
      intent: parsed.intent,
    };
  }

  const leadDate = result.query.legs[0]?.date;
  const qualifiers = [
    context.cabin && context.cabin !== "economy" ? `in ${cabinLabel(context.cabin)}` : "",
    context.directOnly ? "non-stop only" : "",
  ].filter(Boolean);

  const patch = remember(
    { ...context, destinationCode },
    [],
    result.items.map((i) => i.offer.id),
  );

  return {
    text: `${result.total} fare${result.total === 1 ? "" : "s"} from ${usd(result.facets.priceMinUsd)}${
      qualifiers.length ? `, ${listSentence(qualifiers)},` : ""
    } for ${describeParty(partyOf(context))} departing ${leadDate}. ${
      parsed.rank === "fastest"
        ? "Fastest first."
        : parsed.rank === "cheapest"
          ? "Cheapest first."
          : "Best value first."
    }`,
    blocks: [
      {
        kind: "flights",
        title: `Flights ${context.originCode} → ${destinationCode}`,
        note: relaxedNote(result.relaxed),
        items: result.items,
        query: result.query,
        moreHref: result.moreHref,
        comparable: result.items.length >= 2,
      },
    ],
    suggestions: [
      "Compare these flights",
      "What's the fastest option?",
      "Show direct flights only",
      place ? `Find a hotel in ${place.label}` : "Find me a hotel",
    ],
    contextPatch: patch,
    intent: parsed.intent,
  };
}

async function searchExperiences(
  context: AITripContext,
  parsed: ParsedMessage,
  vertical: "tours" | "activities" | "transport",
): Promise<AIResponse> {
  const place = placeOf(context);
  const limit = parsed.counts.activities ?? 3;

  const tool =
    vertical === "tours"
      ? AI_TOOLS.searchTours
      : vertical === "activities"
        ? AI_TOOLS.searchActivities
        : AI_TOOLS.searchTransport;

  const result = await tool({ place, styles: context.styles, limit });

  if (result.items.length === 0) {
    return {
      text: place
        ? `I don't have ${vertical} listed in ${place.label} yet. Want me to look at stays or flights there instead?`
        : "Which destination? Name a city and I'll pull what's bookable there.",
      blocks: [],
      suggestions: ["Things to do in Singapore", "Airport transfer in Dubai", "Desert tours"],
      contextPatch: context,
      intent: parsed.intent,
    };
  }

  const titles: Record<typeof vertical, string> = {
    tours: "Tours",
    activities: "Things to do",
    transport: "Transfers & transport",
  };
  const NOUNS: Record<typeof vertical, [singular: string, plural: string]> = {
    tours: ["tour", "tours"],
    activities: ["activity", "activities"],
    transport: ["transfer option", "transfer options"],
  };
  const nouns = {
    tours: NOUNS.tours[result.total === 1 ? 0 : 1],
    activities: NOUNS.activities[result.total === 1 ? 0 : 1],
    transport: NOUNS.transport[result.total === 1 ? 0 : 1],
  };
  const unit = vertical === "transport" ? "per trip" : "per person";
  const from = usd(Math.min(...result.items.map((i) => i.listing.price.amount)));

  const patch = remember({ ...context }, result.items);
  return {
    text: missedPlace(result.relaxed)
      ? `I don't have ${nouns[vertical]} listed in ${place?.label} yet — here's what's closest, from ${from} ${unit}.`
      : result.widenedTo
        ? `Nothing is listed in ${place?.label} itself, so here are ${nouns[vertical]} elsewhere in ${result.widenedTo}, from ${from} ${unit}.`
        : `${result.total} ${nouns[vertical]}${place ? ` in ${place.label}` : ""}, from ${from} ${unit}.`,
    blocks: [
      {
        kind: "listings",
        title: place ? `${titles[vertical]} in ${place.label}` : titles[vertical],
        note: relaxedNote(result.relaxed),
        vertical,
        items: result.items,
        comparable: result.items.length >= 2,
      },
    ],
    suggestions: [
      place ? `Plan a trip to ${place.label}` : "Plan my trip",
      place ? `Find a hotel in ${place.label}` : "Find me a hotel",
      "Compare these",
    ],
    contextPatch: patch,
    intent: parsed.intent,
  };
}

async function visa(
  context: AITripContext,
  parsed: ParsedMessage,
  request: AIRequest,
): Promise<AIResponse> {
  const place = placeOf(context);
  const destinationCode = context.destinationCode ?? place?.airportCode;

  if (!destinationCode) {
    return {
      text: "Which country are you travelling to? I'll pull the indicative entry requirements and our visa services.",
      blocks: [],
      suggestions: ["Do I need a visa for Thailand?", "Visa for Dubai", "Visa for Türkiye"],
      contextPatch: context,
      intent: parsed.intent,
    };
  }

  const nationality = request.countryCode ?? "US";
  const [requirement, services] = await Promise.all([
    AI_TOOLS.getVisaStatus(destinationCode, nationality),
    AI_TOOLS.searchVisaServices({ place, limit: 2 }),
  ]);

  return {
    text: `${requirement.note} This is indicative prototype data based on a ${nationality} passport — always confirm with the official mission before you book.`,
    blocks: [
      { kind: "visa", requirement, services: services.items },
      {
        kind: "notice",
        tone: "warning",
        text: "Entry requirements are demo data in this prototype and are not legal or immigration advice.",
      },
    ],
    suggestions: [
      "What documents are required?",
      place ? `Flights to ${place.label}` : "Find flights",
      place ? `Hotels in ${place.label}` : "Find hotels",
    ],
    contextPatch: context,
    intent: parsed.intent,
  };
}

/* -------------------------------------------------------------------------- */
/* Comparison                                                                  */
/* -------------------------------------------------------------------------- */

async function compare(context: AITripContext, parsed: ParsedMessage): Promise<AIResponse> {
  const offerIds = context.selectedOfferIds ?? [];
  const listingIds = context.selectedListingIds ?? [];
  const preferFlights = parsed.compareFlights && offerIds.length >= 2;

  if (preferFlights) {
    const comparison = await AI_TOOLS.compareFlights(offerIds);
    if (comparison) {
      return {
        text: "Here's how those fares stack up on the things that actually differ.",
        blocks: [
          { kind: "comparison", title: "Flight comparison", ...comparison },
        ],
        suggestions: ["What's the fastest option?", "Show me the cheapest", "Find a hotel there"],
        contextPatch: context,
        intent: parsed.intent,
      };
    }
  }

  if (listingIds.length >= 2) {
    const comparison = await AI_TOOLS.compareListings(listingIds, context.nights ?? 1);
    if (comparison) {
      return {
        text: "Side by side on price, rating, location, amenities and policy.",
        blocks: [{ kind: "comparison", title: "Stay comparison", ...comparison }],
        suggestions: [
          "Book the recommended one",
          "Show cheaper options",
          context.destination ? `Things to do in ${context.destination}` : "What else is nearby?",
        ],
        contextPatch: context,
        intent: parsed.intent,
      };
    }
  }

  return {
    text: "I need at least two options on the table first — ask me to find some hotels or flights, then say “compare these”.",
    blocks: [],
    suggestions: [
      context.destination ? `Find hotels in ${context.destination}` : "Find a family hotel",
      context.destination ? `Flights to ${context.destination}` : "Find the cheapest flight",
    ],
    contextPatch: context,
    intent: parsed.intent,
  };
}

/* -------------------------------------------------------------------------- */
/* Planning, itinerary and budget                                              */
/* -------------------------------------------------------------------------- */

/**
 * The trip planner. `focus` narrows what's rendered — the plan is rebuilt the
 * same way every time (the tools are deterministic), which is exactly how a
 * real `GET /plans/:id` would behave, so "show me the itinerary" and "what's
 * the budget" never disagree with the plan they came from.
 */
async function planTrip(
  context: AITripContext,
  parsed: ParsedMessage,
  request: AIRequest,
  focus: "full" | "itinerary" | "budget" = "full",
): Promise<AIResponse> {
  const place = placeOf(context);
  if (!place) {
    return {
      text: "Happy to plan it — where are we going? Give me a destination, and dates or a rough length if you have them.",
      blocks: [],
      suggestions: ["Plan a 5-day Dubai trip", "Plan a family trip to Thailand under $2,000", "Plan a romantic weekend in Bali"],
      contextPatch: context,
      intent: parsed.intent,
    };
  }

  const nights = context.nights ?? DEFAULT_NIGHTS;
  const travelers = partyOf(context);

  const { plan, relaxed, flightUnavailable } = await AI_TOOLS.createTripPlan({
    place,
    nights,
    travelers,
    budgetUsd: context.budgetUsd,
    startDate: context.startDate,
    originCode: context.originCode,
    cabin: context.cabin,
    styles: context.styles,
    activities: parsed.counts.activities,
    today: request.today,
  });

  const budget = await AI_TOOLS.calculateTripBudget({ plan, budgetUsd: context.budgetUsd });

  const patch: AITripContext = {
    ...context,
    nights,
    planId: plan.id,
    ...(plan.startDate ? { startDate: plan.startDate, endDate: plan.endDate } : {}),
  };
  remember(
    patch,
    [plan.hotel, ...plan.activities].filter((r): r is AIListingRef => Boolean(r)),
    plan.flight ? [plan.flight.offer.id] : [],
  );

  const blocks: AIBlock[] = [];
  if (focus !== "budget") blocks.push({ kind: "trip-plan", plan });
  if (focus !== "itinerary") blocks.push({ kind: "budget", budget });
  if (focus !== "budget") blocks.push({ kind: "itinerary", plan });

  if (flightUnavailable) {
    blocks.push({
      kind: "notice",
      tone: "info",
      text: context.originCode
        ? `I couldn't price flights to ${place.label} — there's no airport in our dataset serving it, so the total below covers the ground portion only.`
        : "Tell me which airport you're flying from and I'll add real fares to this plan.",
    });
  } else if (!plan.flight) {
    // Flights were searched and came back empty. Saying so beats a plan that
    // quietly costs only the ground portion and looks suspiciously cheap.
    blocks.push({
      kind: "notice",
      tone: "info",
      text:
        context.originCode === plan.destinationCode
          ? `You're already flying out of ${place.label}'s airport, so I've left flights out and costed the ground portion only.`
          : `No fares came back for ${context.originCode} → ${plan.destinationCode} on these dates, so the total covers the ground portion only. Tell me a different origin or date and I'll try again.`,
    });
  }
  if (relaxed.length > 0) {
    blocks.push({ kind: "notice", tone: "info", text: relaxedNote(relaxed)! });
  }

  return {
    text: summarizePlan(plan, budget.totalUsd, context.budgetUsd, budget.overByUsd),
    blocks,
    suggestions: buildPlanSuggestions(plan, context, budget.overByUsd),
    contextPatch: patch,
    intent: parsed.intent,
  };
}

function summarizePlan(
  plan: AITripPlan,
  totalUsd: number,
  budgetUsd: number | undefined,
  overByUsd: number | undefined,
): string {
  const party = describeParty(plan.travelers);
  const head = `Here's a ${plan.days.length}-day ${plan.destination} trip for ${party}${
    plan.startDate ? `, departing ${plan.startDate}` : ""
  }.`;

  const pieces: string[] = [];
  if (plan.flight) pieces.push(`a ${plan.flight.offer.airlineCode} return fare`);
  if (plan.hotel) pieces.push(`${plan.nights} nights at ${plan.hotel.listing.title}`);
  if (plan.transport) pieces.push("airport transfers");
  if (plan.activities.length) {
    pieces.push(`${plan.activities.length} booked experience${plan.activities.length > 1 ? "s" : ""}`);
  }

  const body = pieces.length ? ` It covers ${listSentence(pieces)}.` : "";
  const money = ` Everything totals ${usd(totalUsd)}`;
  const verdict =
    budgetUsd === undefined
      ? "."
      : overByUsd && overByUsd > 0
        ? ` — ${usd(overByUsd)} over your ${usd(budgetUsd)} budget. I've listed real swaps below that close the gap.`
        : ` — inside your ${usd(budgetUsd)} budget, with ${usd(budgetUsd - totalUsd)} to spare.`;

  return `${head}${body}${money}${verdict}`;
}

function buildPlanSuggestions(
  plan: AITripPlan,
  context: AITripContext,
  overByUsd?: number,
): string[] {
  const chips: string[] = [];
  if (overByUsd && overByUsd > 0) chips.push("Show me cheaper options");
  if (plan.hotel) chips.push(`Book ${plan.hotel.listing.title}`);
  if (plan.flight) chips.push("Compare these flights");
  chips.push(`Add an activity in ${plan.destination}`);
  if (!context.budgetUsd) chips.push("Keep it under $1,500");
  return chips.slice(0, 4);
}

/* -------------------------------------------------------------------------- */
/* Bookings                                                                    */
/* -------------------------------------------------------------------------- */

async function bookings(context: AITripContext, parsed: ParsedMessage): Promise<AIResponse> {
  const wantsNext = /next trip|upcoming|what.s next/.test(parsed.text);
  const keyword = extractBookingKeyword(parsed.text);

  const result =
    wantsNext || keyword ? await AI_TOOLS.getTripDetails(keyword) : await AI_TOOLS.getUserBookings();

  if (result.stays.length === 0 && result.flights.length === 0) {
    return {
      text: keyword
        ? `I couldn't find a booking matching “${keyword}”. Your bookings live under Account → Bookings if you'd like to check the reference.`
        : "You don't have any bookings on this account yet. Shall I help you plan a trip?",
      blocks: [],
      suggestions: ["Plan my next trip", "Find the cheapest flight", "Find a family hotel"],
      contextPatch: context,
      intent: parsed.intent,
    };
  }

  const next = result.stays.find((b) => b.status === "upcoming");
  const canCancel = /cancel/.test(parsed.text);

  const blocks: AIBlock[] = [
    {
      kind: "bookings",
      title: wantsNext ? "Coming up next" : "Your bookings",
      stays: result.stays,
      flights: result.flights,
    },
  ];

  if (canCancel && next) {
    blocks.push({
      kind: "notice",
      tone: "info",
      text: `${next.cancellationPolicy} I can't cancel for you — open the booking and use Cancel there, so you see the exact refund before confirming.`,
    });
  }

  const shown = result.stays.length + result.flights.length;
  const summary =
    result.total > shown
      ? `Showing ${shown} of your ${result.total} bookings — the rest are under Account → Bookings.`
      : `You have ${result.total} booking${result.total === 1 ? "" : "s"} on this account.`;

  // Booking dates are stored as full ISO timestamps; travellers want the day.
  const day = (iso: string) => iso.slice(0, 10);
  const text =
    wantsNext && next
      ? `Your next trip is ${next.title} in ${next.location}, ${day(next.checkIn)} to ${day(next.checkOut)} (${next.reference}).`
      : next
        ? `${summary} Next up: ${next.title} in ${next.location} on ${day(next.checkIn)} (${next.reference}).`
        : summary;

  return {
    text,
    blocks,
    suggestions: [
      "What's my next trip?",
      "Can I cancel my booking?",
      next ? `Things to do in ${next.location.split(",")[0]}` : "Plan my next trip",
    ],
    contextPatch: context,
    intent: parsed.intent,
  };
}

/** Pull a destination/reference keyword out of "show my Dubai booking". */
function extractBookingKeyword(text: string): string | undefined {
  const match = text.match(
    /(?:my|the)\s+([a-z0-9\s-]{3,24}?)\s+(?:booking|trip|reservation|stay|flight)/,
  );
  const keyword = match?.[1]?.trim();
  if (!keyword) return undefined;
  if (["next", "last", "first", "upcoming", "recent"].includes(keyword)) return undefined;
  return keyword;
}

/* -------------------------------------------------------------------------- */
/* Booking draft and reviews                                                   */
/* -------------------------------------------------------------------------- */

/** The listing the traveller means: the page they're on, else the last shown. */
async function subjectListing(context: AITripContext, request: AIRequest) {
  if (request.page?.listing) {
    return { vertical: request.page.listing.vertical, slug: request.page.listing.slug };
  }
  const ids = context.selectedListingIds ?? [];
  if (ids.length === 0) return undefined;
  const [listing] = await AI_TOOLS.resolveListings([ids[0]]);
  if (!listing) return undefined;
  return { vertical: listing.vertical, slug: listing.slug };
}

async function bookingDraft(
  context: AITripContext,
  parsed: ParsedMessage,
  request: AIRequest,
): Promise<AIResponse> {
  const subject = await subjectListing(context, request);
  if (!subject) {
    return {
      text: "Which one would you like to book? Ask me to find something first, or open a listing and I'll prepare it from there.",
      blocks: [],
      suggestions: [
        context.destination ? `Find hotels in ${context.destination}` : "Find a family hotel",
        "Plan my next trip",
      ],
      contextPatch: context,
      intent: parsed.intent,
    };
  }

  const nights = context.nights ?? 2;
  const draft = await AI_TOOLS.createBookingDraft({
    vertical: subject.vertical,
    slug: subject.slug,
    checkIn: context.startDate,
    checkOut: context.endDate,
    guests: partySize(partyOf(context)),
    nights,
    today: request.today,
  });

  if (!draft) {
    return {
      text: "I couldn't load that listing to prepare a booking. Try opening it directly and I'll pick it up from the page.",
      blocks: [],
      suggestions: ["Show me other options"],
      contextPatch: context,
      intent: parsed.intent,
    };
  }

  return {
    text: `I've prepared this booking — nothing is charged and nothing is confirmed. Check the dates and guests, then continue to the normal checkout to pay.`,
    blocks: [
      { kind: "booking-draft", draft },
      {
        kind: "notice",
        tone: "info",
        text: "I never confirm or pay for a booking. You'll review and confirm everything on the checkout page.",
      },
    ],
    suggestions: [
      "Change the dates",
      `Summarize reviews for ${draft.listing.title}`,
      "Compare with something cheaper",
    ],
    contextPatch: { ...context, selectedListingIds: [draft.listing.id] },
    intent: parsed.intent,
  };
}

async function reviews(context: AITripContext, parsed: ParsedMessage): Promise<AIResponse> {
  const ids = context.selectedListingIds ?? [];
  const named = await AI_TOOLS.resolveListings(ids.slice(0, 1));
  const listing = named[0];

  if (!listing) {
    return {
      text: "Which place should I summarise reviews for? Find or open a listing first and I'll read its guest reviews.",
      blocks: [],
      suggestions: [
        context.destination ? `Find hotels in ${context.destination}` : "Find a family hotel",
      ],
      contextPatch: context,
      intent: parsed.intent,
    };
  }

  const summary = await AI_TOOLS.summarizeReviews(listing.vertical, listing.slug);
  if (!summary) return fallback(context, parsed);

  const top = summary.themes[0];
  const text = top
    ? `${listing.title} averages ${summary.detail.reviewSummary.average.toFixed(1)} from ${summary.detail.reviewSummary.total.toLocaleString()} reviews. ${top.label.toLowerCase()} comes up most often, in ${top.mentions} of the ${summary.detail.reviews.length} reviews I read.`
    : `${listing.title} averages ${summary.detail.reviewSummary.average.toFixed(1)} from ${summary.detail.reviewSummary.total.toLocaleString()} reviews.`;

  return {
    text,
    blocks: [
      {
        kind: "reviews",
        listingTitle: listing.title,
        href: summary.href,
        summary: summary.detail.reviewSummary,
        themes: summary.themes,
        quotes: summary.quotes,
      },
    ],
    suggestions: [`Book ${listing.title}`, "Compare with something cheaper", "Show me the amenities"],
    contextPatch: context,
    intent: parsed.intent,
  };
}

async function recommend(context: AITripContext, parsed: ParsedMessage): Promise<AIResponse> {
  const place = placeOf(context);
  const result = await AI_TOOLS.getRecommendations({ place, styles: context.styles, limit: 4 });

  const patch = remember({ ...context }, result.items);
  return {
    text: place
      ? `A few things worth booking in ${place.label}, picked on guest rating and value.`
      : "A few of our travellers' favourites right now — tell me a destination and I'll get specific.",
    blocks: result.items.length
      ? [
          {
            kind: "listings",
            title: place ? `Recommended in ${place.label}` : "Recommended for you",
            note: relaxedNote(result.relaxed),
            vertical: result.items[0].listing.vertical as ListingVertical,
            items: result.items,
            comparable: result.items.length >= 2,
          },
        ]
      : [],
    suggestions: ["Compare these", "Plan my next trip", "Help me plan within my budget"],
    contextPatch: patch,
    intent: parsed.intent,
  };
}

/* -------------------------------------------------------------------------- */
/* Small helpers                                                               */
/* -------------------------------------------------------------------------- */

function searchLink(query: string): string | undefined {
  return query ? `/search?q=${encodeURIComponent(query)}` : undefined;
}

function styleLabel(style: string): string {
  return style === "airport" ? "airport access" : style;
}

const CABIN_LABELS: Record<string, string> = {
  economy: "Economy",
  "premium-economy": "Premium Economy",
  business: "Business",
  first: "First",
};

function cabinLabel(cabin: string): string {
  return CABIN_LABELS[cabin] ?? cabin;
}
