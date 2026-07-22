/**
 * search.ts — service seam for global, cross-vertical search.
 *
 * Builds a lightweight in-memory index over every listing (the same mock
 * arrays the catalog reads) and ranks matches by field-weighted relevance.
 * Everything is async via {@link mockDelay} so the UI is written against a real
 * `/search` endpoint; swap these bodies for `fetch` and nothing else changes.
 */

import type { BookingVertical } from "@/types/booking";
import type { Listing } from "@/types/catalog";
import type { SearchSuggestions, VerticalHit } from "@/types/search";
import {
  ACTIVITIES,
  APARTMENTS,
  CONVENTION_HALLS,
  HOTELS,
  RESORTS,
  SHARED_ROOMS,
  TOURS,
  TRANSPORT,
  VISAS,
} from "@/constants/listings";
import { POPULAR_DESTINATIONS } from "@/constants/search";
import { listingHref, VERTICAL_LIST, VERTICALS } from "@/constants/verticals";
import { mockDelay } from "./http";

/** Every listing, flattened once at module load — the search corpus. */
const ALL_LISTINGS: Listing[] = [
  ...HOTELS,
  ...APARTMENTS,
  ...RESORTS,
  ...SHARED_ROOMS,
  ...CONVENTION_HALLS,
  ...TRANSPORT,
  ...TOURS,
  ...ACTIVITIES,
  ...VISAS,
];

/** Vertical-specific free-text worth matching (amenities, types, routes…). */
function extraText(listing: Listing): string {
  const parts: string[] = [];
  switch (listing.vertical) {
    case "hotels":
    case "resorts":
      parts.push(...listing.amenities);
      if ("roomType" in listing && listing.roomType) parts.push(listing.roomType);
      if ("boardType" in listing && listing.boardType) parts.push(listing.boardType);
      break;
    case "shared-rooms":
      parts.push(listing.roomType, ...listing.amenities);
      break;
    case "apartments":
      parts.push("apartment", "whole home");
      break;
    case "convention-hall":
      parts.push(...(listing.layouts ?? []));
      break;
    case "transport":
      parts.push(listing.transportType);
      if (listing.route) parts.push(listing.route.from, listing.route.to);
      break;
    case "tours":
      if (listing.tourType) parts.push(listing.tourType);
      break;
    case "activities":
      parts.push(listing.category);
      break;
    case "visa":
      parts.push(listing.country, listing.entryType ?? "");
      break;
  }
  return parts.join(" ").toLowerCase();
}

interface IndexedListing {
  listing: Listing;
  title: string;
  location: string;
  vlabel: string;
  extra: string;
  badges: string;
}

/** Pre-lowercased searchable fields per listing, computed once. */
const INDEX: IndexedListing[] = ALL_LISTINGS.map((listing) => {
  const cfg = VERTICALS[listing.vertical];
  return {
    listing,
    title: listing.title.toLowerCase(),
    location: [listing.location.label, listing.location.city, listing.location.country]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
    vlabel: `${cfg.label} ${cfg.labelPlural}`.toLowerCase(),
    extra: extraText(listing),
    badges: (listing.badges ?? []).join(" ").toLowerCase(),
  };
});

/** Distinct destination labels drawn from the corpus + curated popular list. */
const DESTINATIONS: string[] = (() => {
  const set = new Set<string>(POPULAR_DESTINATIONS);
  for (const l of ALL_LISTINGS) if (l.location.label) set.add(l.location.label);
  return [...set];
})();

/** Score one indexed listing against pre-split query tokens. 0 = no match. */
function scoreEntry(entry: IndexedListing, tokens: string[]): number {
  let score = 0;
  for (const t of tokens) {
    if (entry.title.startsWith(t)) score += 14;
    else if (entry.title.includes(t)) score += 9;
    if (entry.location.includes(t)) score += 6;
    if (entry.vlabel.includes(t)) score += 4;
    if (entry.badges.includes(t)) score += 3;
    if (entry.extra.includes(t)) score += 2;
  }
  if (score === 0) return 0;
  // Nudge higher-rated, featured results up as a tiebreak.
  score += (entry.listing.rating ?? 0) * 0.2;
  if (entry.listing.featured) score += 0.5;
  return score;
}

function tokenize(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

export interface SearchOptions {
  /** Restrict to a single vertical. */
  vertical?: BookingVertical;
  /** Cap the number of results returned. */
  limit?: number;
}

/**
 * Ranked listing matches for a free-text query, across all verticals (or one,
 * via `options.vertical`). Empty query returns nothing.
 */
export function searchListings(
  query: string,
  options: SearchOptions = {},
): Promise<Listing[]> {
  const tokens = tokenize(query);
  if (tokens.length === 0) return mockDelay([], 200);

  const scored: Array<{ listing: Listing; score: number }> = [];
  for (const entry of INDEX) {
    if (options.vertical && entry.listing.vertical !== options.vertical) continue;
    const score = scoreEntry(entry, tokens);
    if (score > 0) scored.push({ listing: entry.listing, score });
  }
  scored.sort((a, b) => b.score - a.score);

  const ranked = scored.map((s) => s.listing);
  return mockDelay(options.limit ? ranked.slice(0, options.limit) : ranked, 350);
}

/**
 * Grouped autocomplete for the search dialog: a few top listings, matching
 * destinations and vertical shortcuts, plus the total match count.
 */
export function getSearchSuggestions(
  query: string,
  limit = 5,
): Promise<SearchSuggestions> {
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return mockDelay(
      { query, listings: [], destinations: [], verticals: [], totalListings: 0 },
      150,
    );
  }

  const scored: Array<{ listing: Listing; score: number }> = [];
  for (const entry of INDEX) {
    const score = scoreEntry(entry, tokens);
    if (score > 0) scored.push({ listing: entry.listing, score });
  }
  scored.sort((a, b) => b.score - a.score);

  const q = query.trim().toLowerCase();
  const destinations = DESTINATIONS.filter((d) =>
    tokens.some((t) => d.toLowerCase().includes(t)),
  ).slice(0, 4);

  const verticals: VerticalHit[] = VERTICAL_LIST.filter((v) =>
    `${v.label} ${v.labelPlural}`.toLowerCase().includes(q),
  )
    .slice(0, 3)
    .map((v) => ({ key: v.key, label: v.labelPlural, href: v.href, icon: v.icon }));

  return mockDelay(
    {
      query,
      listings: scored.slice(0, limit).map((s) => s.listing),
      destinations,
      verticals,
      totalListings: scored.length,
    },
    250,
  );
}

/** Curated popular searches shown before the user types anything. */
export function getPopularSearches(): string[] {
  return [
    "Beach resorts",
    "Bali",
    "City apartments",
    "Desert tours",
    "Dubai",
    "Airport transfer",
  ];
}

export { listingHref };
