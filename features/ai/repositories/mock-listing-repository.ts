/**
 * MockListingRepository — catalog reads, backed by `services/catalog`.
 *
 * The mock does nothing clever: it is a thin adapter so that the *tools* never
 * import a data module directly. Replacing it with an `ApiListingRepository`
 * that issues `GET /listings?vertical=…` is a change to this file alone.
 */

import type { ListingVertical } from "@/types/booking";
import type { Listing } from "@/types/catalog";
import type { ListingDetail } from "@/types/detail";
import { getAllListings, getListingBySlug, getListingDetail } from "@/services/catalog";
import type { ListingRepository } from "./types";

/** Every vertical an id can be resolved against. */
const ALL_VERTICALS: ListingVertical[] = [
  "hotels",
  "resorts",
  "apartments",
  "shared-rooms",
  "convention-hall",
  "tours",
  "activities",
  "transport",
  "visa",
];

export class MockListingRepository implements ListingRepository {
  readonly id = "mock-listings";

  listByVertical(vertical: ListingVertical): Promise<Listing[]> {
    return getAllListings(vertical);
  }

  getBySlug(vertical: ListingVertical, slug: string): Promise<Listing | undefined> {
    return getListingBySlug(vertical, slug);
  }

  getDetail(vertical: ListingVertical, slug: string): Promise<ListingDetail | undefined> {
    return getListingDetail(vertical, slug);
  }

  async getManyByIds(ids: string[]): Promise<Listing[]> {
    if (ids.length === 0) return [];
    const pools = await Promise.all(ALL_VERTICALS.map((v) => getAllListings(v)));
    const index = new Map(pools.flat().map((l) => [l.id, l]));
    return ids.map((id) => index.get(id)).filter((l): l is Listing => Boolean(l));
  }
}
