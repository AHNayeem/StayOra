/**
 * The join between the public catalogue and the business domain.
 *
 * A `Listing` is a marketing object (title, photos, price-from); a domain
 * `Booking` needs a merchant, a property with room types, and a rate plan. This
 * module is the single place that maps one to the other, so the detail page,
 * checkout, the dashboard and the revenue manager all agree on which merchant
 * owns which listing and what its inventory looks like.
 */

import type { ListingVertical } from "@/types/booking";
import type { Listing } from "@/types/catalog";
import {
  MERCHANTS,
  getCatalogueItem,
  merchantIdForListing,
  merchantRef,
  type MerchantRef,
  type ProductKind,
} from "@/features/dashboard/domain";
import type { PropertyRef } from "@/features/dashboard/domain";

/**
 * The merchant that owns a listing. Stable for a given listing id.
 *
 * Ownership is decided by the merchant roster's own `verticals` (see
 * `domain/catalogue`), and the returned snapshot is read live from the merchant
 * table — so a commission renegotiated in the dashboard is the rate the next
 * booking against this listing is priced at.
 */
export function merchantForListing(listing: Pick<Listing, "id" | "vertical">): MerchantRef {
  // A merchant-created listing already records its owner; only the marketing
  // catalogue needs ownership derived from the roster.
  const id = getCatalogueItem(listing.id)?.merchantId ?? merchantIdForListing(listing);
  return merchantRef(id) ?? MERCHANTS.find((m) => m.id === id) ?? MERCHANTS[0];
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
