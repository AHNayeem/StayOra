/**
 * catalog.ts — service seam for bookable listings. Returns typed mock data
 * today (via {@link mockDelay}) so the UI is already async/API-ready; swap the
 * bodies for real fetches without touching any component.
 */

import type { BookingVertical } from "@/types/booking";
import type {
  Activity,
  Apartment,
  ConventionHall,
  Hotel,
  Listing,
  Resort,
  SharedRoom,
  Tour,
  Transport,
  Visa,
} from "@/types/catalog";
import type { ListingDetail } from "@/types/detail";
import { buildListingDetail } from "@/lib/listing-detail";
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
import { filterLive, isListingLive } from "@/features/dashboard/domain/catalogue-service";
import { mockDelay, paginate, type Paginated } from "./http";

/**
 * All listings keyed by vertical — the single registry the getters read from.
 *
 * `flights` is intentionally empty: a flight is a fare quoted against a search,
 * not a catalog entity with a slug, so it has no {@link Listing} rows. It is
 * served by {@link "@/services/flight.service"} instead. The key is present so
 * the record stays exhaustive and every getter here degrades to an empty result
 * rather than throwing on an undefined lookup.
 */
const REGISTRY: Record<BookingVertical, Listing[]> = {
  hotels: HOTELS,
  apartments: APARTMENTS,
  resorts: RESORTS,
  "shared-rooms": SHARED_ROOMS,
  "convention-hall": CONVENTION_HALLS,
  flights: [],
  transport: TRANSPORT,
  tours: TOURS,
  activities: ACTIVITIES,
  visa: VISAS,
};

/**
 * The listings customers may actually see, for one vertical.
 *
 * Every storefront read goes through here, so the catalogue approval workflow
 * (`domain/catalogue-service`) is what decides what is on sale: an unpublished
 * or rejected listing disappears from search, rails and detail pages without a
 * single component knowing the workflow exists.
 */
function live(vertical: BookingVertical): Listing[] {
  return filterLive(REGISTRY[vertical]);
}

/** Every listing for one vertical — the listing template filters/paginates client-side. */
export function getAllListings(vertical: BookingVertical): Promise<Listing[]> {
  return mockDelay(live(vertical));
}

/** Paginated listings for one vertical (used by listing templates). */
export function getListings(
  vertical: BookingVertical,
  page = 1,
  pageSize = 6,
): Promise<Paginated<Listing>> {
  return mockDelay(paginate(live(vertical), page, pageSize));
}

/**
 * Featured listings for a vertical (home-page rails). Curated `featured` anchors
 * lead, then the rest of the vertical tops up to `limit` — so a rail always
 * shows a full set of cards even though only a handful of listings are flagged
 * featured.
 */
export function getFeatured(vertical: BookingVertical, limit = 6): Promise<Listing[]> {
  const all = live(vertical);
  const pool = [...all.filter((l) => l.featured), ...all.filter((l) => !l.featured)];
  return mockDelay(pool.slice(0, limit));
}

/** Look up a single listing by slug within a vertical (details template). */
export function getListingBySlug(
  vertical: BookingVertical,
  slug: string,
): Promise<Listing | undefined> {
  const match = REGISTRY[vertical].find((l) => l.slug === slug);
  return mockDelay(match && isListingLive(match.id) ? match : undefined);
}

/**
 * Full, page-ready details payload for one listing (details template). Returns
 * `undefined` when the slug is unknown so the route can render `notFound()`.
 * Today it enriches the mock listing via {@link buildListingDetail}; a real API
 * can return {@link ListingDetail} directly from this same seam.
 */
export async function getListingDetail(
  vertical: BookingVertical,
  slug: string,
): Promise<ListingDetail | undefined> {
  const listing = REGISTRY[vertical].find((l) => l.slug === slug);
  const visible = listing && isListingLive(listing.id) ? listing : undefined;
  return mockDelay(visible ? buildListingDetail(visible) : undefined);
}

/** Other listings in the same vertical (excluding `slug`) for the "related" rail. */
export function getRelatedListings(
  vertical: BookingVertical,
  slug: string,
  limit = 3,
): Promise<Listing[]> {
  const related = live(vertical).filter((l) => l.slug !== slug).slice(0, limit);
  return mockDelay(related);
}

// Typed convenience getters for callers that want a concrete shape.
export const getHotels = (): Promise<Hotel[]> => mockDelay(filterLive(HOTELS));
export const getApartments = (): Promise<Apartment[]> => mockDelay(filterLive(APARTMENTS));
export const getResorts = (): Promise<Resort[]> => mockDelay(filterLive(RESORTS));
export const getSharedRooms = (): Promise<SharedRoom[]> => mockDelay(filterLive(SHARED_ROOMS));
export const getConventionHalls = (): Promise<ConventionHall[]> =>
  mockDelay(filterLive(CONVENTION_HALLS));
export const getTransport = (): Promise<Transport[]> => mockDelay(filterLive(TRANSPORT));
export const getTours = (): Promise<Tour[]> => mockDelay(filterLive(TOURS));
export const getActivities = (): Promise<Activity[]> => mockDelay(filterLive(ACTIVITIES));
export const getVisas = (): Promise<Visa[]> => mockDelay(filterLive(VISAS));
