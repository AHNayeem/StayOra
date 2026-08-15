/**
 * Core booking-domain types shared across every vertical.
 * The platform is config-driven: each vertical reuses the same listing and
 * details templates, differing only by its facets and card data slots.
 */

/**
 * All bookable verticals supported by the platform.
 *
 * `flights` is a first-class vertical for navigation, bookings, invoices and
 * admin, but it is *not* a catalog listing: a flight is a fare quoted against a
 * search, not a static entity with a slug. It therefore has its own search,
 * results and detail routes under `/flights` (see
 * {@link "@/services/flight.service"}) and contributes no {@link BookableBase}
 * entities to the catalog.
 */
export const BOOKING_VERTICALS = [
  "hotels",
  "apartments",
  "resorts",
  "shared-rooms",
  "convention-hall",
  "flights",
  "transport",
  "tours",
  "activities",
  "visa",
] as const;

export type BookingVertical = (typeof BOOKING_VERTICALS)[number];

/** Human labels for the verticals — used by every merchant/catalogue picker. */
export const VERTICAL_LABELS: Record<BookingVertical, string> = {
  hotels: "Hotels",
  apartments: "Apartments",
  resorts: "Resorts",
  "shared-rooms": "Shared rooms",
  "convention-hall": "Convention halls",
  flights: "Flights",
  transport: "Transport",
  tours: "Tours",
  activities: "Activities",
  visa: "Visa services",
};

/**
 * Verticals backed by catalog listings — everything except flights. Use this
 * where a `Listing` is genuinely required (catalog getters, listing templates,
 * wishlist) so those surfaces stay precisely typed.
 */
export type ListingVertical = Exclude<BookingVertical, "flights">;

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
