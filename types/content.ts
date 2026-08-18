/**
 * Editorial / marketing content types — the non-bookable entities that fill the
 * home page and content sections. Icons are stored as Lucide names (strings) so
 * these configs stay serialisable and JSX-free; resolve with
 * `components/shared/lucide-icon`.
 */

/**
 * Destinations are a first-class entity with their own lifecycle, not editorial
 * decoration, so the model lives in `types/destination`. Re-exported here
 * because content sections and cards import it alongside the rest of this file
 * — there is exactly one `Destination` type in the codebase.
 */
export type {
  Destination,
  DestinationInput,
  DestinationPatch,
  DestinationSeo,
  DestinationStatus,
} from "./destination";
export { DESTINATION_STATUS_VALUES } from "./destination";

/** A blog / travel-guide post. */
export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  image: string;
  category: string;
  author: string;
  /** ISO date string. */
  date: string;
  readMinutes: number;
}

/** A promotional offer / deal banner. */
export interface Offer {
  id: string;
  title: string;
  description: string;
  image: string;
  /** e.g. "-25%" or "Save $80". */
  discountLabel: string;
  /** Optional promo code to display/copy. */
  code?: string;
  /** ISO date the offer expires. */
  expiresOn?: string;
  href: string;
}

/** A customer testimonial. */
export interface Testimonial {
  id: string;
  author: string;
  role?: string;
  location?: string;
  avatar?: string;
  rating: number;
  body: string;
  date?: string;
}

/** A "why choose us" feature. `icon` is a Lucide name. */
export interface Feature {
  id: string;
  icon: string;
  title: string;
  description: string;
}

/** A headline statistic for counters. `icon` is a Lucide name. */
export interface Stat {
  id: string;
  value: number;
  /** e.g. "k+", "M", "%". */
  suffix?: string;
  label: string;
  icon?: string;
}
