/**
 * Shared vocabulary for the agent's action handlers.
 *
 * Everything here is pure: context folding, party formatting, the phrases used
 * to disclose a relaxed constraint. Handlers stay about their own job, and the
 * honesty rules ("say when the destination was abandoned") live in one place
 * rather than being re-implemented per intent.
 */

import type {
  AIAuthContext,
  AIBlock,
  AIListingRef,
  AIProgressStep,
  AIRequest,
  AIResultRef,
  AIResultSet,
  AISelectionRef,
  AITravelers,
  AITripContext,
  AgentAction,
  AgentEvent,
} from "@/types/ai";
import { listSentence } from "../lib/text";
import { defaultOriginCode, resolvePlace, type AIPlace } from "../lib/places";
import type { ParsedMessage } from "../nlu/parse";
import type { ToolRunner } from "./tool-runner";

/** Default party when the traveller hasn't said. */
export const SOLO: AITravelers = { adults: 1, children: 0 };
/** Default trip length used when planning without a stated duration. */
export const DEFAULT_NIGHTS = 4;
/** How far out an unspecified booking is drafted. */
export const DEFAULT_LEAD_DAYS = 21;

export const STARTER_CHIPS = [
  "Plan my next trip",
  "Find the cheapest flight",
  "Find a family hotel",
  "Build a 7-day itinerary",
  "Help me plan within my budget",
];

/** Everything an action handler is given. */
export interface ActionContext {
  request: AIRequest;
  parsed: ParsedMessage;
  /** The merged running memory for this turn. Handlers read; they patch by return. */
  context: AITripContext;
  tools: ToolRunner;
  emit: (event: AgentEvent) => void;
  /** Today, ISO `YYYY-MM-DD`. */
  today: string;
  /** Now, as an ISO timestamp — for booking records only. */
  now: string;
  auth?: AIAuthContext;
}

/** What a handler produces. Merged by the orchestrator into the response. */
export interface ActionResult {
  text: string;
  blocks: AIBlock[];
  suggestions: string[];
  /** The memory as it should be *after* this action. */
  contextPatch: AITripContext;
  /** Visible progress for multi-step work. */
  steps?: AIProgressStep[];
}

export type ActionHandler = (
  ctx: ActionContext,
  action: AgentAction,
) => Promise<ActionResult> | ActionResult;

/* -------------------------------------------------------------------------- */
/* Context folding                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Fold the page's subject and this turn's slots into the running memory.
 *
 * Page context is the *weakest* source (a traveller viewing a Bali hotel who
 * asks about Tokyo means Tokyo), so it is applied first and the parsed slots
 * overwrite it.
 */
export function mergeContext(request: AIRequest, parsed: ParsedMessage): AITripContext {
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

export function applyPlace(context: AITripContext, place: AIPlace): void {
  context.destination = place.label;
  context.destinationCity = place.city;
  context.destinationCountry = place.country;
  context.destinationCode = place.airportCode;
}

/** Rebuild an {@link AIPlace} from the context so tools can filter on it. */
export function placeOf(context: AITripContext): AIPlace | undefined {
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
export function remember(
  patch: AITripContext,
  listings: AIListingRef[] = [],
  offerIds: string[] = [],
): AITripContext {
  if (listings.length) patch.selectedListingIds = listings.map((l) => l.listing.id);
  if (offerIds.length) patch.selectedOfferIds = offerIds;
  return patch;
}

/**
 * Record the *ordered* result list.
 *
 * This is what "the second one" resolves against. Only identifiers and the
 * couple of facts needed to rank them are kept — the agent must re-fetch a
 * price before quoting it, and storing one here would invite exactly the
 * stale-price bug the booking flow exists to prevent.
 */
export function rememberResults(
  patch: AITripContext,
  set: AIResultSet | undefined,
): AITripContext {
  if (set && set.items.length) patch.lastResults = set;
  return patch;
}

export function listingResultSet(
  items: AIListingRef[],
  intent: AIResultSet["intent"],
): AIResultSet {
  return {
    kind: "listing",
    intent,
    items: items.map(
      (item): AIResultRef => ({
        kind: "listing",
        id: item.listing.id,
        title: item.listing.title,
        priceUsd: item.listing.price.amount,
        rating: item.listing.rating,
        vertical: item.listing.vertical,
        slug: item.listing.slug,
      }),
    ),
  };
}

/** The selection reference for a listing result. */
export function toSelectionRef(item: AIResultRef): AISelectionRef {
  return {
    kind: item.kind,
    id: item.id,
    title: item.title,
    vertical: item.vertical,
    slug: item.slug,
  };
}

/* -------------------------------------------------------------------------- */
/* Party and phrasing                                                          */
/* -------------------------------------------------------------------------- */

export function partyOf(context: AITripContext): AITravelers {
  return context.travelers ?? SOLO;
}

export function partySize(travelers: AITravelers): number {
  return Math.max(1, travelers.adults + travelers.children);
}

/** "2 adults and 1 child" — used in answers so assumptions are always visible. */
export function describeParty(travelers: AITravelers): string {
  const parts = [`${travelers.adults} adult${travelers.adults > 1 ? "s" : ""}`];
  if (travelers.children > 0) {
    parts.push(`${travelers.children} child${travelers.children > 1 ? "ren" : ""}`);
  }
  return listSentence(parts);
}

/** A sentence naming any constraint the search had to drop. */
export function relaxedNote(relaxed: string[]): string | undefined {
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
export function missedPlace(relaxed: string[]): boolean {
  return relaxed.some((entry) => entry.startsWith("destination "));
}

export function searchLink(query: string): string | undefined {
  return query ? `/search?q=${encodeURIComponent(query)}` : undefined;
}

export function styleLabel(style: string): string {
  return style === "airport" ? "airport access" : style;
}

const CABIN_LABELS: Record<string, string> = {
  economy: "Economy",
  "premium-economy": "Premium Economy",
  business: "Business",
  first: "First",
};

export function cabinLabel(cabin: string): string {
  return CABIN_LABELS[cabin] ?? cabin;
}

/** A finished progress trail from labels. */
export function doneSteps(labels: Array<string | [string, string]>): AIProgressStep[] {
  return labels.map((entry) =>
    Array.isArray(entry)
      ? { label: entry[0], status: "done" as const, detail: entry[1] }
      : { label: entry, status: "done" as const },
  );
}
