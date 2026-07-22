/**
 * Editorial / marketing content types — the non-bookable entities that fill the
 * home page and content sections. Icons are stored as Lucide names (strings) so
 * these configs stay serialisable and JSX-free; resolve with
 * `components/shared/lucide-icon`.
 */

import type { Price } from "./booking";

/** A place shown in "Top destinations" grids. */
export interface Destination {
  id: string;
  slug: string;
  name: string;
  country?: string;
  image: string;
  /** Number of listings available there. */
  propertyCount: number;
  /** Cheapest listing price, for a "from $X" hint. */
  startingPrice?: Price;
}

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
