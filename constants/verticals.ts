import type { BookingVertical } from "@/types/booking";

/**
 * Per-vertical configuration. The single registry that drives navigation,
 * hero search tabs, listing routes, and labelling. Add a vertical here and it
 * flows through the whole platform.
 */
export interface VerticalConfig {
  key: BookingVertical;
  /** Singular label, e.g. "Hotel". */
  label: string;
  /** Plural label, e.g. "Hotels". */
  labelPlural: string;
  /** Listing route, e.g. "/hotels". */
  href: string;
  /** Lucide icon name (resolved at render). */
  icon: string;
  /** Price unit shown on cards/details. */
  priceUnit: string;
  /** Whether this vertical shows a date-range search (stay vs. one-off). */
  hasDateRange: boolean;
  /** Whether this vertical shows a guest selector. */
  hasGuests: boolean;
}

export const VERTICALS: Record<BookingVertical, VerticalConfig> = {
  hotels: {
    key: "hotels",
    label: "Hotel",
    labelPlural: "Hotels",
    href: "/hotels",
    icon: "BedDouble",
    priceUnit: "per night",
    hasDateRange: true,
    hasGuests: true,
  },
  apartments: {
    key: "apartments",
    label: "Apartment",
    labelPlural: "Apartments",
    href: "/apartments",
    icon: "Building2",
    priceUnit: "per night",
    hasDateRange: true,
    hasGuests: true,
  },
  resorts: {
    key: "resorts",
    label: "Resort",
    labelPlural: "Resorts",
    href: "/resorts",
    icon: "Palmtree",
    priceUnit: "per night",
    hasDateRange: true,
    hasGuests: true,
  },
  "shared-rooms": {
    key: "shared-rooms",
    label: "Shared Room",
    labelPlural: "Shared Rooms",
    href: "/shared-rooms",
    icon: "Users",
    priceUnit: "per bed / night",
    hasDateRange: true,
    hasGuests: true,
  },
  "convention-hall": {
    key: "convention-hall",
    label: "Convention Hall",
    labelPlural: "Convention Halls",
    href: "/convention-hall",
    icon: "Landmark",
    priceUnit: "per day",
    hasDateRange: true,
    hasGuests: true,
  },
  transport: {
    key: "transport",
    label: "Transport",
    labelPlural: "Transport",
    href: "/transport",
    icon: "BusFront",
    priceUnit: "per trip",
    hasDateRange: true,
    hasGuests: true,
  },
  tours: {
    key: "tours",
    label: "Tour",
    labelPlural: "Tours",
    href: "/tours",
    icon: "Map",
    priceUnit: "per person",
    hasDateRange: true,
    hasGuests: true,
  },
  activities: {
    key: "activities",
    label: "Activity",
    labelPlural: "Activities",
    href: "/activities",
    icon: "Ticket",
    priceUnit: "per person",
    hasDateRange: false,
    hasGuests: true,
  },
  visa: {
    key: "visa",
    label: "Visa",
    labelPlural: "All Visa",
    href: "/all-visa",
    icon: "StickyNote",
    priceUnit: "per person",
    hasDateRange: false,
    hasGuests: false,
  },
};

/** Ordered list for iteration (nav, search tabs). */
export const VERTICAL_LIST: VerticalConfig[] = Object.values(VERTICALS);

/**
 * Detail-page route for a listing, derived from its vertical's base route —
 * e.g. `/hotels/grand-plaza`, `/all-visa/schengen-visa`. The single place this
 * convention lives, so cards, search and links all agree.
 */
export function listingHref(listing: {
  vertical: BookingVertical;
  slug: string;
}): string {
  return `${VERTICALS[listing.vertical].href}/${listing.slug}`;
}
