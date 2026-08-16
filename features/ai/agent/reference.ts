/**
 * Resolving "the second one".
 *
 * The parser said *how* the traveller pointed; this decides *what at*, using the
 * ordered result set the previous answer recorded. Two rules keep it honest:
 *
 *  - An index outside the list resolves to nothing. "The fifth one" against
 *    three results is a question to ask, not a fourth-best guess.
 *  - A deictic ("that hotel") prefers the current selection, then a
 *    single-result list, and otherwise gives up — because "that one" against
 *    five options genuinely is ambiguous.
 */

import type { AIResultSet, AISelectionRef, AITripContext } from "@/types/ai";
import { normalize } from "../lib/text";
import type { AIReference } from "../nlu/references";
import { toSelectionRef } from "./shared";

export interface ResolvedReference {
  ref?: AISelectionRef;
  /** Set when a reference was made but couldn't be resolved. */
  ambiguity?: "out-of-range" | "no-results" | "ambiguous";
  /** The list the reference was resolved against, for follow-up questions. */
  from?: AIResultSet;
}

/** Resolve a detected reference against conversation memory. */
export function resolveReference(
  reference: AIReference | undefined,
  context: AITripContext,
): ResolvedReference {
  if (!reference) return {};
  const set = context.lastResults;

  if (reference.kind === "deictic") {
    if (context.selection) return { ref: context.selection, from: set };
    if (set?.items.length === 1) return { ref: toSelectionRef(set.items[0]), from: set };
    return { ambiguity: set?.items.length ? "ambiguous" : "no-results", from: set };
  }

  if (!set || set.items.length === 0) return { ambiguity: "no-results" };

  switch (reference.kind) {
    case "ordinal": {
      const item = set.items[reference.index - 1];
      return item
        ? { ref: toSelectionRef(item), from: set }
        : { ambiguity: "out-of-range", from: set };
    }
    case "last":
      return { ref: toSelectionRef(set.items[set.items.length - 1]), from: set };
    case "cheapest": {
      const item = [...set.items].sort((a, b) => a.priceUsd - b.priceUsd)[0];
      return { ref: toSelectionRef(item), from: set };
    }
    case "most-expensive": {
      const item = [...set.items].sort((a, b) => b.priceUsd - a.priceUsd)[0];
      return { ref: toSelectionRef(item), from: set };
    }
    case "best-rated": {
      const item = [...set.items].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0];
      return { ref: toSelectionRef(item), from: set };
    }
    case "named": {
      const needle = normalize(reference.title);
      const item = set.items.find((candidate) => normalize(candidate.title).includes(needle));
      return item
        ? { ref: toSelectionRef(item), from: set }
        : { ambiguity: "out-of-range", from: set };
    }
    default:
      return {};
  }
}

/** "1. Hotel A · 2. Hotel B" — the list to re-offer when a reference misses. */
export function describeOptions(set: AIResultSet | undefined): string[] {
  if (!set) return [];
  return set.items.slice(0, 5).map((item, index) => `${index + 1}. ${item.title}`);
}
