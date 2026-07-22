/**
 * Core booking-domain types shared across every vertical.
 * The platform is config-driven: each vertical reuses the same listing and
 * details templates, differing only by its facets and card data slots.
 */

/** All bookable verticals supported by the platform. */
export type BookingVertical =
  | "hotels"
  | "apartments"
  | "resorts"
  | "shared-rooms"
  | "convention-hall"
  | "transport"
  | "tours"
  | "activities"
  | "visa";

/** A discounted price with an optional original price and unit note. */
export interface Price {
  amount: number;
  original?: number;
  /** e.g. "per person", "per night". */
  unit?: string;
  currency?: string;
}

/** A location reference used across cards and details. */
export interface GeoLocation {
  label: string;
  city?: string;
  country?: string;
  countryCode?: string;
  mapUrl?: string;
}

/** A single review left on a bookable entity. */
export interface Review {
  id: string;
  author: string;
  avatar?: string;
  rating: number;
  date: string;
  platform?: "google" | "facebook" | "tripadvisor";
  body: string;
  location?: string;
}

/** Fields common to every bookable entity, extended per vertical. */
export interface BookableBase {
  id: string;
  slug: string;
  vertical: BookingVertical;
  title: string;
  image: string;
  gallery?: string[];
  location: GeoLocation;
  price: Price;
  rating?: number;
  reviewCount?: number;
  badges?: string[];
  featured?: boolean;
}
