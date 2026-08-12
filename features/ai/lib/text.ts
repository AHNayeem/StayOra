/**
 * Text helpers shared by the AI parser and tools.
 *
 * Everything here is pure and locale-neutral: diacritics are folded so "Malé"
 * matches "male" and "Türkiye" matches "turkiye", which matters because the
 * catalog is global and travellers type without accents.
 */

/** Lowercase, fold diacritics, collapse punctuation and whitespace. */
export function normalize(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[‘’']/g, "")
    .replace(/[^a-z0-9$€£¥+.,\- ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Word tokens of a normalized string. */
export function tokens(input: string): string[] {
  return normalize(input).split(" ").filter(Boolean);
}

/** True when `haystack` contains `needle` as a whole word (or phrase). */
export function hasPhrase(haystack: string, needle: string): boolean {
  if (!needle) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`).test(haystack);
}

/** True when the text contains any of the given words/phrases. */
export function hasAny(haystack: string, needles: readonly string[]): boolean {
  return needles.some((n) => hasPhrase(haystack, n));
}

/** Join a list into readable prose: "a, b and c". */
export function listSentence(items: string[], conjunction = "and"): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} ${conjunction} ${items[items.length - 1]}`;
}

/** Sentence-case a label without touching acronyms already in caps. */
export function capitalize(input: string): string {
  return input.charAt(0).toUpperCase() + input.slice(1);
}

/**
 * A short, stable id derived from a string — used for plan/day/item keys so
 * React lists stay keyed without a random source (which would break SSR
 * determinism and re-render stability).
 */
export function stableId(prefix: string, seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return `${prefix}-${Math.abs(hash).toString(36)}`;
}
