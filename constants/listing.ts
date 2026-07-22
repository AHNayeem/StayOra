/**
 * listing.ts — configuration that drives the generic listing template. Everything
 * that differs between verticals (which filter facets apply, the sort options, the
 * page banner copy/image) lives here as data, so the listing UI itself stays
 * vertical-agnostic. Add or retune a vertical by editing this file only.
 */

import type { BookingVertical } from "@/types/booking";
import type { Listing } from "@/types/catalog";
import type { SelectOption } from "@/components/ui/select";

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=80`;

/* -------------------------------------------------------------------------- */
/* Sorting                                                                     */
/* -------------------------------------------------------------------------- */

export type SortKey = "recommended" | "price-asc" | "price-desc" | "rating";

export const DEFAULT_SORT: SortKey = "recommended";

export const SORT_OPTIONS: SelectOption[] = [
  { value: "recommended", label: "Recommended" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "rating", label: "Top rated" },
];

/** How many results per page in the grid. Pagination activates past this count. */
export const LISTING_PAGE_SIZE = 9;

/* -------------------------------------------------------------------------- */
/* Filter facets                                                               */
/* -------------------------------------------------------------------------- */

/**
 * A single filter dimension. `values` returns the display strings a listing
 * matches for this facet (empty when the facet doesn't apply). It narrows the
 * discriminated {@link Listing} union internally, so the whole system stays
 * fully typed with no casts — a facet reads only the fields its vertical has.
 */
export interface ListingFacet {
  key: string;
  label: string;
  values: (listing: Listing) => string[];
}

// Facets shared by every vertical -------------------------------------------

const countryFacet: ListingFacet = {
  key: "country",
  label: "Destination",
  values: (l) => (l.location.country ? [l.location.country] : []),
};

const highlightsFacet: ListingFacet = {
  key: "badges",
  label: "Highlights",
  values: (l) => l.badges ?? [],
};

// Vertical-specific facets ---------------------------------------------------

const starsFacet: ListingFacet = {
  key: "stars",
  label: "Star rating",
  values: (l) =>
    l.vertical === "hotels" || l.vertical === "resorts" ? [`${l.stars} stars`] : [],
};

const amenitiesFacet: ListingFacet = {
  key: "amenities",
  label: "Amenities",
  values: (l) =>
    l.vertical === "hotels" || l.vertical === "resorts" || l.vertical === "shared-rooms"
      ? l.amenities
      : [],
};

const boardFacet: ListingFacet = {
  key: "board",
  label: "Board",
  values: (l) => (l.vertical === "resorts" && l.boardType ? [l.boardType] : []),
};

const bedroomsFacet: ListingFacet = {
  key: "bedrooms",
  label: "Bedrooms",
  values: (l) =>
    l.vertical === "apartments"
      ? [`${l.bedrooms} bedroom${l.bedrooms > 1 ? "s" : ""}`]
      : [],
};

const roomTypeFacet: ListingFacet = {
  key: "roomType",
  label: "Room type",
  values: (l) => (l.vertical === "shared-rooms" ? [l.roomType] : []),
};

const layoutsFacet: ListingFacet = {
  key: "layouts",
  label: "Layouts",
  values: (l) => (l.vertical === "convention-hall" ? (l.layouts ?? []) : []),
};

const transportTypeFacet: ListingFacet = {
  key: "transportType",
  label: "Vehicle type",
  values: (l) => (l.vertical === "transport" ? [l.transportType] : []),
};

const tourTypeFacet: ListingFacet = {
  key: "tourType",
  label: "Tour type",
  values: (l) => (l.vertical === "tours" && l.tourType ? [l.tourType] : []),
};

const activityCategoryFacet: ListingFacet = {
  key: "category",
  label: "Category",
  values: (l) => (l.vertical === "activities" ? [l.category] : []),
};

const visaCountryFacet: ListingFacet = {
  key: "visaCountry",
  label: "Country",
  values: (l) => (l.vertical === "visa" ? [l.country] : []),
};

const entryTypeFacet: ListingFacet = {
  key: "entryType",
  label: "Entry type",
  values: (l) => (l.vertical === "visa" && l.entryType ? [l.entryType] : []),
};

/** Which facets each vertical's filter sidebar offers, in display order. */
export const LISTING_FACETS: Record<BookingVertical, ListingFacet[]> = {
  hotels: [starsFacet, amenitiesFacet, countryFacet, highlightsFacet],
  apartments: [bedroomsFacet, countryFacet, highlightsFacet],
  resorts: [starsFacet, boardFacet, amenitiesFacet, countryFacet],
  "shared-rooms": [roomTypeFacet, amenitiesFacet, countryFacet],
  "convention-hall": [layoutsFacet, countryFacet],
  transport: [transportTypeFacet, countryFacet],
  tours: [tourTypeFacet, countryFacet, highlightsFacet],
  activities: [activityCategoryFacet, countryFacet, highlightsFacet],
  visa: [visaCountryFacet, entryTypeFacet],
};

/* -------------------------------------------------------------------------- */
/* Page banner copy                                                            */
/* -------------------------------------------------------------------------- */

export interface ListingPageMeta {
  /** Banner + document title. */
  title: string;
  /** Supporting line under the title and the meta description. */
  description: string;
  bannerImage: string;
}

export const LISTING_PAGE: Record<BookingVertical, ListingPageMeta> = {
  hotels: {
    title: "Find your stay",
    description: "Handpicked hotels for every trip — from boutique boltholes to grand city landmarks.",
    bannerImage: img("photo-1566073771259-6a8506099945"),
  },
  apartments: {
    title: "Apartments & homes",
    description: "Space to spread out — self-catering apartments and whole homes in the best neighbourhoods.",
    bannerImage: img("photo-1502672260266-1c1ef2d93688"),
  },
  resorts: {
    title: "Resorts & retreats",
    description: "All-inclusive escapes, spa retreats and beachfront resorts to unwind in style.",
    bannerImage: img("photo-1571896349842-33c89424de2d"),
  },
  "shared-rooms": {
    title: "Shared rooms & hostels",
    description: "Sociable, budget-friendly beds in well-located hostels and poshtels worldwide.",
    bannerImage: img("photo-1555854877-bab0e564b8d5"),
  },
  "convention-hall": {
    title: "Convention halls & venues",
    description: "Ballrooms, conference centres and event pavilions for gatherings of any size.",
    bannerImage: img("photo-1519167758481-83f550bb49b3"),
  },
  transport: {
    title: "Transport & transfers",
    description: "Private transfers, coaches and ferries to get you there comfortably.",
    bannerImage: img("photo-1544620347-c4fd4a3d5957"),
  },
  tours: {
    title: "Tours & experiences",
    description: "Guided multi-day adventures and cultural journeys led by local experts.",
    bannerImage: img("photo-1543429776-2782fc8e1acd"),
  },
  activities: {
    title: "Things to do",
    description: "Book unforgettable activities and day experiences at your destination.",
    bannerImage: img("photo-1507608616759-54f48f0af0ee"),
  },
  visa: {
    title: "Visa services",
    description: "Fast, reliable visa assistance for destinations around the world.",
    bannerImage: img("photo-1488646953014-85cb44e25828"),
  },
};
