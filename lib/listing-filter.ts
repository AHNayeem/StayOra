/**
 * listing-filter.ts — the pure, framework-free filtering/sorting engine behind
 * the listing template. Kept out of the client component so it is trivially
 * testable and reusable: give it listings + a filter state + the vertical's
 * facet config and it returns the derived result set.
 */

import type { Listing } from "@/types/catalog";
import type { ListingFacet, SortKey } from "@/constants/listing";

/** Inclusive numeric range (matches the PriceRangeSlider value shape). */
export interface PriceRange {
  min: number;
  max: number;
}

/** A single selectable value within a facet, with its result count. */
export interface FacetOption {
  value: string;
  count: number;
}

/** A rendered facet group: its config identity plus the derived options. */
export interface FacetGroup {
  key: string;
  label: string;
  options: FacetOption[];
}

/** The complete state of the filter sidebar. */
export interface ListingFilterState {
  search: string;
  price: PriceRange;
  /** facetKey → selected values. OR within a facet, AND across facets. */
  facets: Record<string, string[]>;
}

/** Min/max price across a set of listings, rounded to tidy slider endpoints. */
export function priceBounds(listings: Listing[]): PriceRange {
  if (listings.length === 0) return { min: 0, max: 0 };
  let min = Infinity;
  let max = -Infinity;
  for (const l of listings) {
    if (l.price.amount < min) min = l.price.amount;
    if (l.price.amount > max) max = l.price.amount;
  }
  return { min: Math.floor(min), max: Math.ceil(max) };
}

/**
 * Derive the facet groups (options + counts) for a vertical from its data.
 * Counts are computed against the full set, so they read as "how many listings
 * carry this attribute" rather than shifting as other filters are applied.
 * Empty groups (no listing supplies a value) are dropped.
 */
export function buildFacetGroups(
  listings: Listing[],
  facets: ListingFacet[],
): FacetGroup[] {
  return facets
    .map((facet) => {
      const counts = new Map<string, number>();
      for (const listing of listings) {
        for (const value of facet.values(listing)) {
          counts.set(value, (counts.get(value) ?? 0) + 1);
        }
      }
      const options: FacetOption[] = [...counts.entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => a.value.localeCompare(b.value));
      return { key: facet.key, label: facet.label, options };
    })
    .filter((group) => group.options.length > 0);
}

/** Apply search + price + facet filters. Returns a new array (order preserved). */
export function filterListings(
  listings: Listing[],
  state: ListingFilterState,
  facets: ListingFacet[],
): Listing[] {
  const query = state.search.trim().toLowerCase();
  const facetByKey = new Map(facets.map((f) => [f.key, f]));

  return listings.filter((listing) => {
    if (
      listing.price.amount < state.price.min ||
      listing.price.amount > state.price.max
    ) {
      return false;
    }

    if (query) {
      const haystack = `${listing.title} ${listing.location.label}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    for (const [key, selected] of Object.entries(state.facets)) {
      if (selected.length === 0) continue;
      const facet = facetByKey.get(key);
      if (!facet) continue;
      const values = facet.values(listing);
      if (!selected.some((value) => values.includes(value))) return false;
    }

    return true;
  });
}

/** Sort a copy of the listings by the chosen key. */
export function sortListings(listings: Listing[], sort: SortKey): Listing[] {
  const sorted = [...listings];
  switch (sort) {
    case "price-asc":
      return sorted.sort((a, b) => a.price.amount - b.price.amount);
    case "price-desc":
      return sorted.sort((a, b) => b.price.amount - a.price.amount);
    case "rating":
      return sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    case "recommended":
      return sorted.sort((a, b) => {
        const featured = Number(b.featured ?? false) - Number(a.featured ?? false);
        return featured !== 0 ? featured : (b.rating ?? 0) - (a.rating ?? 0);
      });
  }
}

/** Count active constraints, for the "clear all" affordance and result badge. */
export function countActiveFilters(
  state: ListingFilterState,
  bounds: PriceRange,
): number {
  let count = 0;
  if (state.search.trim()) count += 1;
  if (state.price.min > bounds.min || state.price.max < bounds.max) count += 1;
  for (const selected of Object.values(state.facets)) count += selected.length;
  return count;
}
