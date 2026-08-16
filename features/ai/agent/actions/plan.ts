/**
 * Trip planning, itinerary and budget.
 *
 * One code path builds all three: the plan is rebuilt the same way every time
 * (the tools are deterministic), which is exactly how a real `GET /plans/:id`
 * would behave — so "show me the itinerary" and "what's the budget" can never
 * disagree with the plan they came from.
 */

import type { AIBlock, AIListingRef, AITripPlan } from "@/types/ai";
import { usd } from "../../lib/money";
import { listSentence } from "../../lib/text";
import type { ActionContext, ActionResult } from "../shared";
import {
  DEFAULT_NIGHTS,
  describeParty,
  listingResultSet,
  partyOf,
  placeOf,
  relaxedNote,
  remember,
  rememberResults,
} from "../shared";

export async function planTrip(
  ctx: ActionContext,
  focus: "full" | "itinerary" | "budget" = "full",
): Promise<ActionResult> {
  const { context, parsed, request } = ctx;
  const place = placeOf(context);

  if (!place) {
    return {
      text: "Happy to plan it — where are we going? Give me a destination, and dates or a rough length if you have them.",
      blocks: [
        {
          kind: "clarification",
          question: "Where would you like to go?",
          options: ["Dubai", "Bali", "Cox's Bazar", "Sylhet"],
        },
      ],
      suggestions: [
        "Plan a 5-day Dubai trip",
        "Plan a family trip to Thailand under $2,000",
        "Plan a romantic weekend in Bali",
      ],
      contextPatch: context,
    };
  }

  const nights = context.nights ?? DEFAULT_NIGHTS;
  const travelers = partyOf(context);
  const exclude = parsed.refine?.remove;

  const { plan, relaxed, flightUnavailable } = await ctx.tools.call("createTripPlan", [
    {
      place,
      nights,
      travelers,
      budgetUsd: context.budgetUsd,
      startDate: context.startDate,
      originCode: context.originCode,
      cabin: context.cabin,
      styles: context.styles,
      activities: parsed.counts.activities,
      exclude: exclude ? [exclude] : undefined,
      today: request.today,
    },
  ]);

  const budget = await ctx.tools.call("calculateTripBudget", [
    { plan, budgetUsd: context.budgetUsd },
  ]);

  // Saving a plan against an account is a write, so it needs a signed-in
  // traveller — and planning itself must never require one.
  if (ctx.auth?.authenticated) await ctx.tools.call("saveTripPlan", [plan]);

  const patch = {
    ...context,
    nights,
    planId: plan.id,
    ...(plan.startDate ? { startDate: plan.startDate, endDate: plan.endDate } : {}),
  };
  const bookables = [plan.hotel, ...plan.activities].filter((r): r is AIListingRef => Boolean(r));
  remember(patch, bookables, plan.flight ? [plan.flight.offer.id] : []);
  rememberResults(patch, listingResultSet(bookables, "plan-trip"));

  const blocks: AIBlock[] = [];
  if (focus !== "budget") blocks.push({ kind: "trip-plan", plan });
  if (focus !== "itinerary") blocks.push({ kind: "budget", budget });
  if (focus !== "budget") blocks.push({ kind: "itinerary", plan });

  if (exclude) {
    blocks.push({
      kind: "notice",
      tone: "info",
      text: `Left the ${exclude === "stay" ? "accommodation" : exclude} out of this plan, as you asked — the total below reflects that.`,
    });
  }

  if (flightUnavailable) {
    blocks.push({
      kind: "notice",
      tone: "info",
      text: context.originCode
        ? `I couldn't price flights to ${place.label} — there's no airport in our dataset serving it, so the total below covers the ground portion only.`
        : "Tell me which airport you're flying from and I'll add real fares to this plan.",
    });
  } else if (!plan.flight && exclude !== "flight") {
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
    suggestions: buildPlanSuggestions(plan, context.budgetUsd, budget.overByUsd),
    contextPatch: patch,
    steps: [
      { label: "Searching flights", status: plan.flight ? "done" : "failed" },
      { label: "Searching stays", status: plan.hotel ? "done" : "failed" },
      { label: "Adding transfers and experiences", status: "done" },
      { label: "Costing it against your budget", status: "done", detail: usd(budget.totalUsd) },
    ],
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
  budgetUsd: number | undefined,
  overByUsd?: number,
): string[] {
  const chips: string[] = [];
  if (overByUsd && overByUsd > 0) chips.push("Show me cheaper options");
  if (plan.hotel) chips.push(`Book ${plan.hotel.listing.title}`);
  if (plan.flight) chips.push("Compare these flights");
  chips.push(`Add an activity in ${plan.destination}`);
  if (!budgetUsd) chips.push("Keep it under $1,500");
  return chips.slice(0, 4);
}
