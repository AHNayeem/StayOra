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
import type { AirportHit, SearchSuggestions, VerticalHit } from "@/types/search";
import { AIRPORTS } from "@/lib/mock/airports";
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

/**
 * Airports matching a query, as flight-search shortcuts.
 *
 * Flights have no catalog listings, so a search for "DXB" would otherwise return
 * nothing at all. Exact IATA matches rank first — people who type three capital
 * letters know exactly what they mean.
 *
 * The link intentionally omits a date: the flight search fills in a sensible
 * default on the client, and guessing one here would need a wall-clock read in
 * a module that must stay deterministic.
 */
function matchAirports(query: string, limit = 3): AirportHit[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const scored: Array<{ hit: AirportHit; score: number }> = [];
  for (const airport of AIRPORTS) {
    const code = airport.code.toLowerCase();
    const city = airport.city.toLowerCase();
    const name = airport.name.toLowerCase();

    let score = 0;
    if (code === q) score = 100;
    else if (city.startsWith(q)) score = 60;
    else if (city.includes(q)) score = 35;
    else if (name.includes(q)) score = 20;
    if (score === 0) continue;
    if (airport.popular) score += 5;

    scored.push({
      hit: {
        code: airport.code,
        city: airport.city,
        country: airport.country,
        name: airport.name,
        href: `/flights?to=${airport.code}`,
      },
      score,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.hit);
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
      {
        query,
        listings: [],
        destinations: [],
        verticals: [],
        airports: [],
        totalListings: 0,
      },
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
      airports: matchAirports(query),
      totalListings: scored.length,
    },
    250,
  );
}

/**
 * Zero-result recovery.
 *
 * "No results" is where a traveller leaves. Rather than a dead end with a list
 * of unrelated popular searches, this relaxes the query one constraint at a
 * time — the way a person would — and reports *which* constraint it dropped, so
 * the UI can say why it is showing what it is showing:
 *
 *   1. drop the least specific word ("cheap beach villa bali" → "beach villa bali")
 *   2. match on the destination alone
 *   3. match anywhere in the same country
 *   4. fall back to the strongest listings overall
 *
 * The reason is part of the contract: recovery that cannot explain itself just
 * looks like a broken search.
 */
export type RecoveryStrategy = "fewer-words" | "destination" | "same-country" | "popular";

export interface SearchRecovery {
  strategy: RecoveryStrategy;
  /** One line explaining what was relaxed, shown above the results. */
  reason: string;
  /** The query that actually produced these, when it differs from the original. */
  usedQuery?: string;
  listings: Listing[];
  /** Alternative searches worth a click. */
  suggestions: string[];
}

function rank(tokens: string[], vertical?: BookingVertical): Listing[] {
  const scored: Array<{ listing: Listing; score: number }> = [];
  for (const entry of INDEX) {
    if (vertical && entry.listing.vertical !== vertical) continue;
    const score = scoreEntry(entry, tokens);
    if (score > 0) scored.push({ listing: entry.listing, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.listing);
}

export function recoverSearch(
  query: string,
  options: SearchOptions = {},
): Promise<SearchRecovery> {
  const tokens = tokenize(query);
  const limit = options.limit ?? 8;

  // 1. Fewer words — the most common cause of zero results is over-specifying.
  for (let drop = 1; drop < tokens.length; drop += 1) {
    const kept = tokens.slice(0, tokens.length - drop);
    const listings = rank(kept, options.vertical);
    if (listings.length > 0) {
      const usedQuery = kept.join(" ");
      return mockDelay(
        {
          strategy: "fewer-words" as const,
          reason: `Nothing matched every word, so we searched for “${usedQuery}”.`,
          usedQuery,
          listings: listings.slice(0, limit),
          suggestions: kept.map((token) => token),
        },
        250,
      );
    }
  }

  // 2. A destination in the query, even if the rest of it matched nothing.
  const destination = POPULAR_DESTINATIONS.find((d) =>
    tokens.some((token) => d.toLowerCase().includes(token) || token.includes(d.toLowerCase())),
  );
  if (destination) {
    const listings = rank(tokenize(destination), options.vertical);
    if (listings.length > 0) {
      return mockDelay(
        {
          strategy: "destination" as const,
          reason: `No exact match, but here is everything we have in ${destination}.`,
          usedQuery: destination,
          listings: listings.slice(0, limit),
          suggestions: [destination],
        },
        250,
      );
    }
  }

  // 3. Same country as anything the query half-matched.
  const country = ALL_LISTINGS.find((listing) =>
    tokens.some((token) => listing.location.country?.toLowerCase().includes(token)),
  )?.location.country;
  if (country) {
    const listings = ALL_LISTINGS.filter(
      (listing) =>
        listing.location.country === country &&
        (!options.vertical || listing.vertical === options.vertical),
    );
    if (listings.length > 0) {
      return mockDelay(
        {
          strategy: "same-country" as const,
          reason: `Nothing in that exact spot — these are elsewhere in ${country}.`,
          usedQuery: country,
          listings: listings.slice(0, limit),
          suggestions: [country],
        },
        250,
      );
    }
  }

  // 4. Give them the best of what exists rather than an empty page.
  const best = [...ALL_LISTINGS]
    .filter((listing) => !options.vertical || listing.vertical === options.vertical)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, limit);
  return mockDelay(
    {
      strategy: "popular" as const,
      reason: "We couldn't match that search — here is what travellers book most.",
      listings: best,
      suggestions: getPopularSearches(),
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
