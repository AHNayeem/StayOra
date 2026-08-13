/**
 * The join between the public catalogue and the business domain.
 *
 * A `Listing` is a marketing object (title, photos, price-from); a domain
 * `Booking` needs a merchant, a property with room types, and a rate plan. This
 * module is the single place that maps one to the other, so the detail page,
 * checkout, the dashboard and the revenue manager all agree on which merchant
 * owns which listing and what its inventory looks like.
 */

import type { BookingVertical, ListingVertical } from "@/types/booking";
import type { Listing } from "@/types/catalog";
import { hashString } from "@/lib/random";
import { MERCHANTS, type MerchantRef, type ProductKind } from "@/features/dashboard/domain";
import type { PropertyRef } from "@/features/dashboard/domain";

/**
 * Which merchants plausibly operate each vertical — mirrors the merchant roster
 * in the domain seed so a hotel is never owned by the visa agency.
 */
const MERCHANTS_BY_VERTICAL: Record<BookingVertical, string[]> = {
  hotels: ["mrc_azure", "mrc_highline", "mrc_cedar"],
  resorts: ["mrc_palm", "mrc_azure"],
  apartments: ["mrc_marina", "mrc_cedar"],
  "shared-rooms": ["mrc_sunset"],
  "convention-hall": ["mrc_highline"],
  tours: ["mrc_desert", "mrc_sunset"],
  activities: ["mrc_desert", "mrc_sunset"],
  transport: ["mrc_transit"],
  visa: ["mrc_visahub"],
  flights: ["mrc_skyfare"],
};

/** The merchant that owns a listing. Stable for a given listing id. */
export function merchantForListing(listing: Pick<Listing, "id" | "vertical">): MerchantRef {
  const pool = MERCHANTS_BY_VERTICAL[listing.vertical] ?? [];
  const ids = pool.length ? pool : MERCHANTS.map((m) => m.id);
  const id = ids[hashString(listing.id) % ids.length];
  return MERCHANTS.find((m) => m.id === id) ?? MERCHANTS[0];
}

/** The inventory engine's view of a listing. */
export function toPropertyRef(listing: Listing): PropertyRef {
  return {
    id: listing.id,
    slug: listing.slug,
    vertical: listing.vertical,
    title: listing.title,
    basePrice: listing.price.amount,
    image: listing.image,
  };
}

/** A listing vertical is always a valid product kind in the domain. */
export function productKindFor(vertical: ListingVertical): ProductKind {
  return vertical;
}

/** The compact listing reference stored on a booking. */
export function toListingRef(listing: Listing): NonNullable<
  import("@/features/dashboard/domain").Booking["listing"]
> {
  return {
    id: listing.id,
    slug: listing.slug,
    image: listing.image,
    vertical: listing.vertical,
  };
}
