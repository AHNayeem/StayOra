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
import { mockDelay, paginate, type Paginated } from "./http";

/** All listings keyed by vertical — the single registry the getters read from. */
const BY_VERTICAL: Record<BookingVertical, Listing[]> = {
  hotels: HOTELS,
  apartments: APARTMENTS,
  resorts: RESORTS,
  "shared-rooms": SHARED_ROOMS,
  "convention-hall": CONVENTION_HALLS,
  transport: TRANSPORT,
  tours: TOURS,
  activities: ACTIVITIES,
  visa: VISAS,
};

/** Every listing for one vertical — the listing template filters/paginates client-side. */
export function getAllListings(vertical: BookingVertical): Promise<Listing[]> {
  return mockDelay(BY_VERTICAL[vertical]);
}

/** Paginated listings for one vertical (used by listing templates). */
export function getListings(
  vertical: BookingVertical,
  page = 1,
  pageSize = 6,
): Promise<Paginated<Listing>> {
  return mockDelay(paginate(BY_VERTICAL[vertical], page, pageSize));
}

/**
 * Featured listings for a vertical (home-page rails). Curated `featured` anchors
 * lead, then the rest of the vertical tops up to `limit` — so a rail always
 * shows a full set of cards even though only a handful of listings are flagged
 * featured.
 */
export function getFeatured(vertical: BookingVertical, limit = 6): Promise<Listing[]> {
  const all = BY_VERTICAL[vertical];
  const pool = [...all.filter((l) => l.featured), ...all.filter((l) => !l.featured)];
  return mockDelay(pool.slice(0, limit));
}

/** Look up a single listing by slug within a vertical (details template). */
export function getListingBySlug(
  vertical: BookingVertical,
  slug: string,
): Promise<Listing | undefined> {
  return mockDelay(BY_VERTICAL[vertical].find((l) => l.slug === slug));
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
  const listing = BY_VERTICAL[vertical].find((l) => l.slug === slug);
  return mockDelay(listing ? buildListingDetail(listing) : undefined);
}

/** Other listings in the same vertical (excluding `slug`) for the "related" rail. */
export function getRelatedListings(
  vertical: BookingVertical,
  slug: string,
  limit = 3,
): Promise<Listing[]> {
  const related = BY_VERTICAL[vertical].filter((l) => l.slug !== slug).slice(0, limit);
  return mockDelay(related);
}

// Typed convenience getters for callers that want a concrete shape.
export const getHotels = (): Promise<Hotel[]> => mockDelay(HOTELS);
export const getApartments = (): Promise<Apartment[]> => mockDelay(APARTMENTS);
export const getResorts = (): Promise<Resort[]> => mockDelay(RESORTS);
export const getSharedRooms = (): Promise<SharedRoom[]> => mockDelay(SHARED_ROOMS);
export const getConventionHalls = (): Promise<ConventionHall[]> =>
  mockDelay(CONVENTION_HALLS);
export const getTransport = (): Promise<Transport[]> => mockDelay(TRANSPORT);
export const getTours = (): Promise<Tour[]> => mockDelay(TOURS);
export const getActivities = (): Promise<Activity[]> => mockDelay(ACTIVITIES);
export const getVisas = (): Promise<Visa[]> => mockDelay(VISAS);
