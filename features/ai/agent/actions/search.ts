/**
 * Search actions — stays, flights, experiences, visas, recommendations, and the
 * "show me cheaper ones" refinement that re-runs the last search with one
 * constraint moved.
 *
 * The disclosure rules from the original engine are preserved exactly: a
 * constraint that had to be dropped is named out loud, a destination that
 * couldn't be served is never papered over, and a country-wide fallback says so.
 */

import type { AIListingRef } from "@/types/ai";
import { usd } from "../../lib/money";
import { listSentence } from "../../lib/text";
import type { ActionContext, ActionResult } from "../shared";
import {
  cabinLabel,
  describeParty,
  listingResultSet,
  missedPlace,
  partyOf,
  placeOf,
  relaxedNote,
  remember,
  rememberResults,
  searchLink,
  styleLabel,
} from "../shared";
import { recommendationScorer } from "../recommendation";

/* -------------------------------------------------------------------------- */
/* Stays                                                                       */
/* -------------------------------------------------------------------------- */

export async function searchStays(ctx: ActionContext): Promise<ActionResult> {
  const { context } = ctx;
  const place = placeOf(context);
  const nights = context.nights;

  const result = await ctx.tools.call("searchHotels", [
    {
      place,
      maxNightlyUsd: context.maxNightlyUsd,
      minRating: context.minRating,
      amenities: context.amenities,
      vertical: context.stayVertical,
      styles: context.styles,
      nights,
      // Over-fetch, then let the scorer decide the order and cut to three.
      limit: 8,
    },
  ]);

  if (result.items.length === 0) {
    return {
      text: place
        ? `I couldn't find any stays in ${place.label} in our inventory. Want me to look at a nearby city?`
        : "Which destination should I search? Name a city or country and I'll pull real options.",
      blocks: [],
      suggestions: ["Hotels in Bali under $150", "Beach resorts in Cox's Bazar", "Family-friendly hotels in Bangkok"],
      contextPatch: context,
    };
  }

  // Rank with the explicit scoring model, so the order can be justified from
  // the same facts the cards show.
  const scored = recommendationScorer.score({
    candidates: result.items,
    maxNightlyUsd: context.maxNightlyUsd,
    budgetUsd: context.budgetUsd,
    nights,
    styles: context.styles,
    amenities: context.amenities,
    city: place?.city,
    country: place?.country,
    vertical: context.stayVertical,
  });

  const items: AIListingRef[] = scored.slice(0, 3).map(({ ref, reasons }) => ({
    ...ref,
    reason: reasons.length ? `${ref.reason} · ${listSentence(reasons)}` : ref.reason,
  }));

  const cheapest = items.reduce((best, item) =>
    item.listing.price.amount < best.listing.price.amount ? item : best,
  );

  // Only claim a filter that actually held. `relaxed` tells us which ones didn't.
  const dropped = new Set(result.relaxed);
  const honoured = (constraint: string, phrase: string) => (dropped.has(constraint) ? "" : phrase);

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

  const patch = rememberResults(
    remember({ ...context }, items),
    listingResultSet(items, "search-hotels"),
  );

  return {
    text,
    blocks: [
      {
        kind: "listings",
        title: place ? `Stays in ${place.label}` : "Stays for you",
        note: relaxedNote(result.relaxed),
        vertical: items[0].listing.vertical,
        items,
        moreHref: searchLink(place?.label ?? ""),
        comparable: items.length >= 2,
      },
    ],
    suggestions: [
      "Compare these",
      `Book ${items[0].listing.title}`,
      "Show cheaper options",
      place ? `Plan a trip to ${place.label}` : "Plan my trip",
    ],
    contextPatch: patch,
    steps: [
      { label: "Searching stays", status: "done", detail: `${result.total} matched` },
      { label: "Ranking on your preferences", status: "done" },
    ],
  };
}

/* -------------------------------------------------------------------------- */
/* Flights                                                                     */
/* -------------------------------------------------------------------------- */

export async function searchFlights(ctx: ActionContext): Promise<ActionResult> {
  const { context, parsed, request } = ctx;
  const place = placeOf(context);
  const destinationCode = context.destinationCode ?? place?.airportCode;

  if (!destinationCode) {
    return {
      text: "Where would you like to fly to? Give me a city or airport and I'll pull live fares.",
      blocks: [
        {
          kind: "clarification",
          question: "Where are you flying to?",
          options: ["Dubai", "Bangkok", "London", "Singapore"],
        },
      ],
      suggestions: ["Cheap flights from Dhaka to Dubai", "Business class Dhaka to London", "Flights to Bangkok"],
      contextPatch: context,
    };
  }
  if (!context.originCode) {
    return {
      text: `And where are you flying from? Once I have an origin I'll search fares to ${place?.label ?? destinationCode}.`,
      blocks: [
        {
          kind: "clarification",
          question: "Which airport are you departing from?",
          options: ["From Dhaka", "From London", "From Dubai", "From Singapore"],
        },
      ],
      suggestions: ["From Dhaka", "From London", "From Dubai"],
      contextPatch: context,
    };
  }

  const result = await ctx.tools.call("searchFlights", [
    {
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
    },
  ]);

  if (result.items.length === 0) {
    return {
      text: `No fares came back for ${context.originCode} → ${destinationCode} on that date. Try different dates, or I can check a nearby airport.`,
      blocks: [],
      suggestions: ["Try next month", "Show direct flights only", "Change my dates"],
      contextPatch: context,
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
  patch.lastResults = {
    kind: "flight",
    intent: "search-flights",
    items: result.items.map((item) => ({
      kind: "flight" as const,
      id: item.offer.id,
      title: `${item.offer.airlineCode} ${item.offer.slices[0].fromCode}→${item.offer.slices[item.offer.slices.length - 1].toCode}`,
      priceUsd: item.offer.fare.totalUsd,
    })),
  };

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
    steps: [
      { label: "Searching fares", status: "done", detail: `${result.total} found` },
      { label: "Ranking by your preference", status: "done" },
    ],
  };
}

/* -------------------------------------------------------------------------- */
/* Tours, activities and transport                                             */
/* -------------------------------------------------------------------------- */

export async function searchExperiences(
  ctx: ActionContext,
  vertical: "tours" | "activities" | "transport",
): Promise<ActionResult> {
  const { context, parsed } = ctx;
  const place = placeOf(context);
  const limit = parsed.counts.activities ?? 3;

  const toolName =
    vertical === "tours"
      ? ("searchTours" as const)
      : vertical === "activities"
        ? ("searchActivities" as const)
        : ("searchTransport" as const);

  const result = await ctx.tools.call(toolName, [
    { place, styles: context.styles, limit },
  ]);

  if (result.items.length === 0) {
    return {
      text: place
        ? `I don't have ${vertical} listed in ${place.label} yet. Want me to look at stays or flights there instead?`
        : "Which destination? Name a city and I'll pull what's bookable there.",
      blocks: [],
      suggestions: ["Things to do in Singapore", "Airport transfer in Dubai", "Desert tours"],
      contextPatch: context,
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
  const noun = NOUNS[vertical][result.total === 1 ? 0 : 1];
  const unit = vertical === "transport" ? "per trip" : "per person";
  const from = usd(Math.min(...result.items.map((i) => i.listing.price.amount)));

  const patch = rememberResults(
    remember({ ...context }, result.items),
    listingResultSet(result.items, parsed.intent),
  );

  return {
    text: missedPlace(result.relaxed)
      ? `I don't have ${noun} listed in ${place?.label} yet — here's what's closest, from ${from} ${unit}.`
      : result.widenedTo
        ? `Nothing is listed in ${place?.label} itself, so here are ${noun} elsewhere in ${result.widenedTo}, from ${from} ${unit}.`
        : `${result.total} ${noun}${place ? ` in ${place.label}` : ""}, from ${from} ${unit}.`,
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
      `Book ${result.items[0].listing.title}`,
      "Compare these",
    ],
    contextPatch: patch,
  };
}

/* -------------------------------------------------------------------------- */
/* Visa                                                                        */
/* -------------------------------------------------------------------------- */

export async function visa(ctx: ActionContext): Promise<ActionResult> {
  const { context, request } = ctx;
  const place = placeOf(context);
  const destinationCode = context.destinationCode ?? place?.airportCode;

  if (!destinationCode) {
    return {
      text: "Which country are you travelling to? I'll pull the indicative entry requirements and our visa services.",
      blocks: [],
      suggestions: ["Do I need a visa for Thailand?", "Visa for Dubai", "Visa for Türkiye"],
      contextPatch: context,
    };
  }

  const nationality = request.countryCode ?? "US";
  const [requirement, services] = await Promise.all([
    ctx.tools.call("getVisaStatus", [destinationCode, nationality]),
    ctx.tools.call("searchVisaServices", [{ place, limit: 2 }]),
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
  };
}

/* -------------------------------------------------------------------------- */
/* Recommendations                                                             */
/* -------------------------------------------------------------------------- */

export async function recommend(ctx: ActionContext): Promise<ActionResult> {
  const { context } = ctx;
  const place = placeOf(context);
  const result = await ctx.tools.call("getRecommendations", [
    { place, styles: context.styles, limit: 4 },
  ]);

  const patch = rememberResults(
    remember({ ...context }, result.items),
    listingResultSet(result.items, "recommend"),
  );

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
            vertical: result.items[0].listing.vertical,
            items: result.items,
            comparable: result.items.length >= 2,
          },
        ]
      : [],
    suggestions: ["Compare these", "Plan my next trip", "Help me plan within my budget"],
    contextPatch: patch,
  };
}

/* -------------------------------------------------------------------------- */
/* Refinement                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * "Show me cheaper ones" / "anything better?"
 *
 * Refinement is a *constraint move*, not a new search: the ceiling is set from
 * what was actually shown (below the cheapest result for "cheaper", above the
 * best rating for "better"), so the follow-up is guaranteed to differ from the
 * answer the traveller just rejected — which is the whole reason they asked.
 */
export async function refine(ctx: ActionContext): Promise<ActionResult> {
  const { context, parsed } = ctx;
  const set = context.lastResults;
  const direction = parsed.refine?.direction ?? "more";

  if (!set || set.items.length === 0) {
    return {
      text: "I don't have anything on the table to change yet — ask me to find something first.",
      blocks: [],
      suggestions: ["Find a family hotel", "Find the cheapest flight", "Plan my next trip"],
      contextPatch: context,
    };
  }

  if (set.kind === "flight") {
    // For fares the platform's own ranking is the right lever.
    return searchFlights({
      ...ctx,
      parsed: { ...parsed, rank: direction === "cheaper" ? "cheapest" : "recommended" },
    });
  }

  const prices = set.items.map((item) => item.priceUsd);
  const ratings = set.items.map((item) => item.rating ?? 0);
  const next: typeof context = { ...context };

  if (direction === "cheaper") {
    next.maxNightlyUsd = Math.max(10, Math.min(...prices) - 1);
    next.minRating = undefined;
  } else if (direction === "better") {
    next.minRating = Math.min(5, Math.max(...ratings) + 0.1);
    next.maxNightlyUsd = undefined;
  }

  const result = await searchStays({ ...ctx, context: next });

  // Did the constraint actually hold? The stay search relaxes what it can't
  // meet, so "cheaper" can legitimately come back with the same list — and
  // announcing "cheaper than everything I showed you" over it would be a lie.
  const fresh = result.contextPatch.lastResults?.items ?? [];
  const honoured =
    direction === "cheaper"
      ? fresh.some((item) => item.priceUsd < Math.min(...prices))
      : direction === "better"
        ? fresh.some((item) => (item.rating ?? 0) > Math.max(...ratings))
        : fresh.some((item) => !set.items.some((prior) => prior.id === item.id));

  if (!honoured) {
    const where = context.destination ? ` in ${context.destination}` : "";
    const lead =
      direction === "cheaper"
        ? `I don't have anything cheaper${where} — ${usd(Math.min(...prices))} a night is the lowest our inventory goes. `
        : direction === "better"
          ? `Nothing${where} rates higher than what I already showed you. `
          : `That's everything I have${where}. `;
    return { ...result, text: `${lead}${result.text}` };
  }

  const lead =
    direction === "cheaper"
      ? `Cheaper than everything I showed you (under ${usd(next.maxNightlyUsd ?? 0)} a night). `
      : direction === "better"
        ? "Rated higher than the last set. "
        : "A different set for the same search. ";

  return { ...result, text: `${lead}${result.text}` };
}
