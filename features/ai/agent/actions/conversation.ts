/**
 * Conversational actions — greeting, capability, the honest fallback, and
 * "I want to go to Dubai" (a destination with no ask, which is context rather
 * than a search).
 */

import type { AIListingRef } from "@/types/ai";
import type { ActionContext, ActionResult } from "../shared";
import {
  STARTER_CHIPS,
  listingResultSet,
  placeOf,
  relaxedNote,
  remember,
  rememberResults,
} from "../shared";

export function greet(ctx: ActionContext): ActionResult {
  const { context } = ctx;
  return {
    text: context.destination
      ? `Hi! We were talking about ${context.destination} — want me to pick up from there?`
      : "Hi! I'm the Otithee travel concierge. Tell me where you'd like to go, who's coming and roughly what you want to spend, and I'll put a real trip together from our live inventory — and book it for you when you're ready.",
    blocks: [],
    suggestions: STARTER_CHIPS,
    contextPatch: context,
  };
}

export function help(ctx: ActionContext): ActionResult {
  return {
    text: "I search Otithee's own inventory — I never make prices up. I can find flights and stays, compare options side by side, build a day-by-day itinerary, cost it against your budget, look up your existing bookings, and take a booking all the way through to a confirmation with your approval.",
    blocks: [
      {
        kind: "facts",
        title: "What I can do",
        items: [
          { label: "Search", value: "Flights, hotels, resorts, apartments, tours, activities, transfers, visas" },
          { label: "Compare", value: "Any two to four stays or fares, side by side" },
          { label: "Plan", value: "Day-by-day itineraries with real prices" },
          { label: "Budget", value: "Costed against your number, with cheaper real alternatives" },
          { label: "Book", value: "Availability, price, your details, your confirmation — then it's booked" },
          { label: "Manage", value: "Your bookings, changes and cancellations, priced by the real policy" },
        ],
      },
    ],
    suggestions: STARTER_CHIPS,
    contextPatch: ctx.context,
  };
}

export function fallback(ctx: ActionContext): ActionResult {
  const { context } = ctx;
  return {
    text: context.destination
      ? `I didn't quite catch that. For ${context.destination} I can find flights, stays, things to do, build a full plan, or book something you've picked — which would you like?`
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
  };
}

/** "I want to visit Dubai." — remember it, and show what's there. */
export async function setContext(ctx: ActionContext): Promise<ActionResult> {
  const { context } = ctx;
  const place = placeOf(context);
  if (!place) return fallback(ctx);

  const result = await ctx.tools.call("getRecommendations", [
    { place, styles: context.styles, limit: 4 },
  ]);

  const patch = rememberResults(
    remember({ ...context }, result.items),
    listingResultSet(result.items, "set-context"),
  );

  return {
    text: `${place.label} — noted. Here's what our travellers book most there. Tell me your dates and budget and I'll build the whole trip.`,
    blocks: result.items.length
      ? [
          {
            kind: "listings",
            title: `Popular in ${place.label}`,
            note: relaxedNote(result.relaxed),
            vertical: result.items[0].listing.vertical,
            items: result.items as AIListingRef[],
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
  };
}
