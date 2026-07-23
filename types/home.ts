/**
 * Home-page content types — the marketing/editorial entities that only appear
 * on the landing page (flash deals, curated packages, country highlights,
 * inspiration themes, partners, awards). Kept separate from the reusable
 * {@link "./content"} types so the generic content layer stays lean. Icons are
 * Lucide names (strings) so configs stay serialisable; resolve with
 * `components/shared/lucide-icon`.
 */

import type { BookingVertical, Price } from "./booking";

/** A time-limited discount surfaced in the "Flash deals" band. */
export interface FlashDeal {
  id: string;
  title: string;
  location: string;
  image: string;
  vertical: BookingVertical;
  price: Price;
  /** Whole-number percentage off, for the badge. */
  discountPct: number;
  /**
   * Seconds remaining from page load until the deal expires. The countdown is
   * relative (not a wall-clock date) so the band always feels "live" in the
   * prototype regardless of when it's viewed.
   */
  endsInSeconds: number;
  /** Units already claimed, for the scarcity meter. */
  claimed: number;
  /** Total units in the drop. */
  total: number;
  href: string;
}

/** A curated multi-item bundle shown in "Trending packages". */
export interface TravelPackage {
  id: string;
  title: string;
  destination: string;
  country: string;
  image: string;
  nights: number;
  days: number;
  price: Price;
  rating: number;
  reviews: number;
  /** What's bundled, e.g. ["Flights", "4★ Hotel", "Breakfast"]. */
  includes: string[];
  /** Optional ribbon, e.g. "Best seller". */
  tag?: string;
  href: string;
}

/** A "browse by country" tile. */
export interface CountryHighlight {
  code: string;
  name: string;
  /** Flag emoji (derived from the ISO code). */
  flag: string;
  image: string;
  listingCount: number;
  fromPrice: Price;
  href: string;
}

/** A "travel inspiration" theme tile (mood/interest-based entry point). */
export interface InspirationTheme {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  /** Lucide icon name. */
  icon: string;
  href: string;
}

/** A partner / brand shown in the trust strip. */
export interface Partner {
  id: string;
  name: string;
  category: string;
}

/** An industry award / recognition. `icon` is a Lucide name. */
export interface Award {
  id: string;
  title: string;
  organisation: string;
  year: number;
  icon: string;
}
