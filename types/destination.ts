/**
 * The canonical destination model — one type for the whole platform.
 *
 * A destination is editorial content that also acts as a *place index*: the
 * public site browses it, the dashboard authors it, and the catalogue hangs off
 * it (stays, tours and activities are matched by `name`/`country`, never by a
 * second location table).
 *
 * Two identifiers, deliberately distinct:
 *
 *  - `id` is internal and never appears in a URL. Dashboard routes key off it,
 *    so renaming a place cannot orphan its edit screen.
 *  - `slug` is the public URL identifier and is unique across the store. Links
 *    are always built from it (see `destinationHref`), never from `name` — the
 *    reason `/destinations/bali` was a 404 before was link text being turned
 *    into a URL by hand.
 *
 * The shape is API-ready: `features/destinations/repository.ts` reads and writes
 * exactly these fields, so swapping the mock store for HTTP changes no consumer.
 */

import type { Price } from "./booking";

export const DESTINATION_STATUS_VALUES = ["draft", "published", "archived"] as const;

/**
 * Lifecycle of a destination.
 *
 *  - `draft` — authored, not on the public site.
 *  - `published` — live: listed on `/destinations` and reachable at its slug.
 *  - `archived` — retired. Kept for the record and out of every public list,
 *    which is why archiving is offered instead of deleting.
 */
export type DestinationStatus = (typeof DESTINATION_STATUS_VALUES)[number];

/** Search-engine overrides; both fall back to the destination's own copy. */
export interface DestinationSeo {
  seoTitle?: string;
  seoDescription?: string;
}

/** A place travellers browse — the canonical entity. */
export interface Destination {
  /** Internal identifier. Stable across renames; used by dashboard routes. */
  id: string;
  /** Public URL identifier, unique across the store. */
  slug: string;
  name: string;
  country: string;
  /** Sub-national area or island group, e.g. "Bali", "Île-de-France". */
  region?: string;
  /** Long-form editorial copy; blank lines separate paragraphs. */
  description: string;
  /** One-line summary used on cards and as the metadata fallback. */
  shortDescription?: string;
  /** Hero/card image URL. */
  image: string;
  /** Additional photos for the detail gallery (the hero leads it). */
  gallery?: string[];
  status: DestinationStatus;
  /** Promoted on the home page and in the "Featured" band. */
  featured?: boolean;

  attractions?: string[];
  activities?: string[];
  highlights?: string[];

  latitude?: number;
  longitude?: number;

  /** Listings available there, for the "N properties" hint on cards. */
  propertyCount?: number;
  /** Cheapest listing price, for a "from $X" hint. */
  startingPrice?: Price;

  metadata?: DestinationSeo;

  /** ISO timestamps. */
  createdAt: string;
  updatedAt: string;
}

/**
 * What a caller may supply when creating or updating a destination.
 *
 * `id`, `createdAt` and `updatedAt` are the store's to set — a client that could
 * choose its own id would be able to overwrite an existing record.
 */
export type DestinationInput = Omit<Destination, "id" | "createdAt" | "updatedAt">;

/** A partial edit; unchanged fields are preserved by the store. */
export type DestinationPatch = Partial<DestinationInput>;
