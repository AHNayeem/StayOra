import type { BookingVertical } from "./booking";

/** A selected check-in / check-out range, as ISO `YYYY-MM-DD` strings. */
export interface DateRangeValue {
  from: string | null;
  to: string | null;
}

/**
 * Guest counts keyed by unit (e.g. `adults`, `children`, `rooms`). Which units
 * exist is driven per-vertical by `SEARCH_CONFIG`, so this is an open map rather
 * than a fixed shape.
 */
export type GuestCounts = Record<string, number>;

/** The full value emitted by the hero search widget when a search is run. */
export interface SearchValues {
  vertical: BookingVertical;
  location: string;
  dates: DateRangeValue;
  guests: GuestCounts;
}

import type { Listing } from "./catalog";

/** A vertical shortcut surfaced in suggestions (e.g. typing "hotel"). */
export interface VerticalHit {
  key: BookingVertical;
  label: string;
  href: string;
  icon: string;
}

/**
 * An airport matched by the global search, linking into a pre-filled flight
 * search. Flights aren't catalog listings, so they can't ride the `listings`
 * group — but "DXB" or "Dubai airport" is a search people genuinely run, and it
 * should reach fares rather than a dead end.
 */
export interface AirportHit {
  /** IATA code. */
  code: string;
  city: string;
  country: string;
  name: string;
  /** Pre-filled flight-search URL. */
  href: string;
}

/**
 * Grouped autocomplete payload for the global search dialog. The service ranks
 * everything mock-side so the dialog just renders groups.
 */
export interface SearchSuggestions {
  query: string;
  /** Top ranked listing matches (already sorted by relevance). */
  listings: Listing[];
  /** Top matching destinations (free-text, link to a search). */
  destinations: string[];
  /** Matching vertical shortcuts. */
  verticals: VerticalHit[];
  /** Matching airports, linking into a flight search. */
  airports: AirportHit[];
  /** Total number of listing matches across all verticals. */
  totalListings: number;
}
