/**
 * Comparison and review summaries.
 *
 * Both are "explain what I already showed you" actions: every cell in a
 * comparison table and every theme in a review summary is counted from data the
 * site itself displays, so the verdict can be checked against the table it sits
 * under.
 */

import type { ActionContext, ActionResult } from "../shared";

export async function compare(ctx: ActionContext): Promise<ActionResult> {
  const { context, parsed } = ctx;
  const offerIds = context.selectedOfferIds ?? [];
  const listingIds = context.selectedListingIds ?? [];
  const preferFlights = parsed.compareFlights && offerIds.length >= 2;

  if (preferFlights) {
    const comparison = await ctx.tools.call("compareFlights", [offerIds]);
    if (comparison) {
      return {
        text: "Here's how those fares stack up on the things that actually differ.",
        blocks: [{ kind: "comparison", title: "Flight comparison", ...comparison }],
        suggestions: ["What's the fastest option?", "Show me the cheapest", "Find a hotel there"],
        contextPatch: context,
      };
    }
  }

  if (listingIds.length >= 2) {
    const comparison = await ctx.tools.call("compareListings", [listingIds, context.nights ?? 1]);
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
      };
    }
  }

  // One result is a different problem from no results: the traveller asked a
  // reasonable question and the inventory can't answer it, which is worth
  // saying plainly rather than explaining the feature back to them.
  const shown = listingIds.length + offerIds.length;
  return {
    text:
      shown === 1
        ? "There's only one match here, so there's nothing to line it up against. Widen the dates or the budget and I'll compare what comes back."
        : "I need at least two options on the table first — ask me to find some hotels or flights, then say “compare these”.",
    blocks: [],
    suggestions: [
      context.destination ? `Find hotels in ${context.destination}` : "Find a family hotel",
      context.destination ? `Flights to ${context.destination}` : "Find the cheapest flight",
    ],
    contextPatch: context,
  };
}

export async function summarizeReviews(ctx: ActionContext): Promise<ActionResult> {
  const { context } = ctx;
  const target = context.selection ?? null;
  const ids = target ? [target.id] : (context.selectedListingIds ?? []).slice(0, 1);
  const named = await ctx.tools.call("resolveListings", [ids]);
  const listing = named[0];

  if (!listing) {
    return {
      text: "Which place should I summarise reviews for? Find or open a listing first and I'll read its guest reviews.",
      blocks: [],
      suggestions: [
        context.destination ? `Find hotels in ${context.destination}` : "Find a family hotel",
      ],
      contextPatch: context,
    };
  }

  const summary = await ctx.tools.call("summarizeReviews", [listing.vertical, listing.slug]);
  if (!summary) {
    return {
      text: `I couldn't load guest reviews for ${listing.title}.`,
      blocks: [],
      suggestions: ["Show me other options"],
      contextPatch: context,
    };
  }

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
  };
}
