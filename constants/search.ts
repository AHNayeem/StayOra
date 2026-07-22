import type { BookingVertical } from "@/types/booking";
import type { GuestCounts } from "@/types/search";
import { VERTICAL_LIST } from "./verticals";

/** Verticals shown as tabs in the hero search, in registry order. */
export const HERO_SEARCH_TABS = VERTICAL_LIST;

/** A single counter inside the guest/occupancy popover. */
export interface GuestUnit {
  key: string;
  label: string;
  /** Optional sub-label, e.g. "Ages 13+". */
  hint?: string;
  min: number;
  max: number;
}

/**
 * Per-vertical search field labelling. Whether the date and guest fields appear
 * at all is driven by `VerticalConfig.hasDateRange` / `hasGuests`; this record
 * only tailors the copy and the guest counters for each vertical.
 */
export interface VerticalSearchConfig {
  locationLabel: string;
  locationPlaceholder: string;
  startDateLabel: string;
  endDateLabel: string;
  guestsLabel: string;
  guestUnits: GuestUnit[];
}

const STAY_GUESTS: GuestUnit[] = [
  { key: "adults", label: "Adults", hint: "Ages 13+", min: 1, max: 16 },
  { key: "children", label: "Children", hint: "Ages 2–12", min: 0, max: 10 },
  { key: "rooms", label: "Rooms", min: 1, max: 8 },
];

const PEOPLE_GUESTS: GuestUnit[] = [
  { key: "adults", label: "Adults", hint: "Ages 13+", min: 1, max: 20 },
  { key: "children", label: "Children", hint: "Ages 2–12", min: 0, max: 12 },
];

const STAY_CONFIG: VerticalSearchConfig = {
  locationLabel: "Where",
  locationPlaceholder: "Search destinations",
  startDateLabel: "Check in",
  endDateLabel: "Check out",
  guestsLabel: "Guests",
  guestUnits: STAY_GUESTS,
};

/**
 * Search config for every vertical. Falls back to `STAY_CONFIG` shape but tunes
 * copy per vertical so the same widget reads naturally everywhere.
 */
export const SEARCH_CONFIG: Record<BookingVertical, VerticalSearchConfig> = {
  hotels: STAY_CONFIG,
  apartments: {
    ...STAY_CONFIG,
    locationPlaceholder: "City, area or apartment",
  },
  resorts: STAY_CONFIG,
  "shared-rooms": {
    ...STAY_CONFIG,
    guestsLabel: "Beds",
    guestUnits: [
      { key: "adults", label: "Guests", hint: "Ages 13+", min: 1, max: 12 },
      { key: "rooms", label: "Beds", min: 1, max: 8 },
    ],
  },
  "convention-hall": {
    locationLabel: "Where",
    locationPlaceholder: "City or venue",
    startDateLabel: "Event date",
    endDateLabel: "End date",
    guestsLabel: "Attendees",
    guestUnits: [
      { key: "adults", label: "Attendees", min: 10, max: 2000 },
      { key: "rooms", label: "Halls", min: 1, max: 10 },
    ],
  },
  transport: {
    locationLabel: "From / To",
    locationPlaceholder: "Pickup or route",
    startDateLabel: "Departure",
    endDateLabel: "Return",
    guestsLabel: "Passengers",
    guestUnits: PEOPLE_GUESTS,
  },
  tours: {
    locationLabel: "Destination",
    locationPlaceholder: "Where to?",
    startDateLabel: "From",
    endDateLabel: "To",
    guestsLabel: "Travellers",
    guestUnits: PEOPLE_GUESTS,
  },
  activities: {
    locationLabel: "Destination",
    locationPlaceholder: "City or activity",
    startDateLabel: "Date",
    endDateLabel: "Date",
    guestsLabel: "Guests",
    guestUnits: PEOPLE_GUESTS,
  },
  visa: {
    locationLabel: "Destination country",
    locationPlaceholder: "Where are you travelling?",
    startDateLabel: "Date",
    endDateLabel: "Date",
    guestsLabel: "Applicants",
    guestUnits: PEOPLE_GUESTS,
  },
};

/** Seed a guest map from a vertical's units, using each unit's minimum. */
export function defaultGuests(units: GuestUnit[]): GuestCounts {
  return Object.fromEntries(units.map((u) => [u.key, u.min]));
}

/** Mock destination suggestions for the location field. */
export const POPULAR_DESTINATIONS: string[] = [
  "Bali, Indonesia",
  "Santorini, Greece",
  "Paris, France",
  "Dubai, UAE",
  "Maldives",
  "Bangkok, Thailand",
  "Tokyo, Japan",
  "New York, USA",
  "Rome, Italy",
  "Cox's Bazar, Bangladesh",
  "Cappadocia, Türkiye",
  "Phuket, Thailand",
];
