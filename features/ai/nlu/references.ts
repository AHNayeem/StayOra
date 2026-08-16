/**
 * Contextual reference detection.
 *
 * "Book the second one" is the sentence that separates an assistant from a
 * search box. This module only *detects the form* of a reference — resolving it
 * to a real entity is {@link "../agent/reference".resolveReference}'s job,
 * because that needs the conversation's memory and this stays a pure function
 * of the sentence.
 *
 * Deliberately conservative: an unrecognised phrase produces no reference at
 * all, and the agent asks which one rather than picking something and hoping.
 */

import { hasAny, hasPhrase, normalize } from "../lib/text";

/** How the traveller pointed at something already on screen. */
export type AIReference =
  /** "the second one", "number 3", "#2" */
  | { kind: "ordinal"; index: number }
  /** "the cheaper option", "the cheapest" */
  | { kind: "cheapest" }
  | { kind: "most-expensive" }
  /** "the best rated one", "the highest rated" */
  | { kind: "best-rated" }
  /** "the last one" */
  | { kind: "last" }
  /** "that hotel", "this one" — means the current selection, or the only result */
  | { kind: "deictic" }
  /** "the Marina Bay one" — matched by title later */
  | { kind: "named"; title: string };

const ORDINAL_WORDS: Record<string, number> = {
  first: 1,
  "1st": 1,
  second: 2,
  "2nd": 2,
  third: 3,
  "3rd": 3,
  fourth: 4,
  "4th": 4,
  fifth: 5,
  "5th": 5,
  last: -1,
};

/**
 * Find the reference in a message, if there is one.
 *
 * Ordinals win over superlatives because they are more specific: "book the
 * second cheapest" means the second of the list I showed, not the cheapest.
 */
export function detectReference(raw: string): AIReference | undefined {
  const text = normalize(raw);

  // "the second one", "book the third", "option 2", "#2"
  for (const [word, index] of Object.entries(ORDINAL_WORDS)) {
    if (!hasPhrase(text, word)) continue;
    if (index === -1) return { kind: "last" };
    return { kind: "ordinal", index };
  }

  const numbered = text.match(/\b(?:option|number|no\.?|#)\s*(\d{1,2})\b/);
  if (numbered) return { kind: "ordinal", index: Number(numbered[1]) };

  if (hasAny(text, ["cheaper option", "cheapest one", "the cheapest", "cheaper one", "least expensive"])) {
    return { kind: "cheapest" };
  }
  if (hasAny(text, ["most expensive", "priciest", "the dearest"])) {
    return { kind: "most-expensive" };
  }
  if (hasAny(text, ["best rated", "highest rated", "best reviewed", "top rated one", "the best one"])) {
    return { kind: "best-rated" };
  }

  // "the Marina Bay one" — a title fragment before "one".
  const named = text.match(/\bthe\s+(.{3,40}?)\s+one\b/);
  if (named && !ORDINAL_WORDS[named[1]]) return { kind: "named", title: named[1].trim() };

  if (
    hasAny(text, [
      "this one",
      "that one",
      "this hotel",
      "that hotel",
      "this place",
      "that place",
      "this flight",
      "that flight",
      "it",
      "this",
      "that",
    ])
  ) {
    return { kind: "deictic" };
  }

  return undefined;
}

/** True when the message is an unqualified yes. */
export function isAffirmation(raw: string): boolean {
  const text = normalize(raw);
  if (text.split(" ").length > 8) return false;
  return hasAny(text, [
    "yes",
    "yes please",
    "yep",
    "yeah",
    "sure",
    "confirm",
    "confirm it",
    "confirm booking",
    "confirm the booking",
    "go ahead",
    "do it",
    "book it now",
    "thats right",
    "looks good",
    "all good",
    "proceed",
    "ok",
    "okay",
  ]);
}

/** True when the message is an unqualified no / stop. */
export function isNegation(raw: string): boolean {
  const text = normalize(raw);
  if (text.split(" ").length > 8) return false;
  return hasAny(text, [
    "no",
    "nope",
    "not now",
    "stop",
    "never mind",
    "nevermind",
    "forget it",
    "dont book",
    "do not book",
    "cancel that",
    "abandon",
    "start over",
  ]);
}
