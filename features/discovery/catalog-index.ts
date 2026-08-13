/**
 * Client-side catalogue index — id → {@link Listing}, built once.
 *
 * The wishlist and the compare tray both persist *ids only* (a listing is not a
 * user-owned object), so both need one place to resolve an id back to the
 * catalogue entity. This is that place — a lookup over the existing constants,
 * not a second listing model.
 */

import type { Listing } from "@/types/catalog";
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

/** Every catalogue listing, across all nine bookable verticals. */
export const ALL_LISTINGS: Listing[] = [
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

const INDEX: Map<string, Listing> = new Map(ALL_LISTINGS.map((l) => [l.id, l]));

/** Resolve one listing id, or `undefined` if it is no longer in the catalogue. */
export function listingById(id: string): Listing | undefined {
  return INDEX.get(id);
}

/** Resolve a list of ids, dropping any that no longer exist. */
export function listingsByIds(ids: string[]): Listing[] {
  return ids.map((id) => INDEX.get(id)).filter((l): l is Listing => Boolean(l));
}
