/**
 * Per-vertical entity types. Each extends {@link BookableBase} with only the
 * fields that vertical's card and details template need. Keeping them separate
 * (rather than one union of optionals) lets each card component consume a
 * precise, fully-typed shape — no `any`, no defensive optional chaining.
 */

import type { BookableBase } from "./booking";

/** Hotel — star class + headline amenities. */
export interface Hotel extends BookableBase {
  vertical: "hotels";
  /** Official star rating (1–5), distinct from the review score. */
  stars: number;
  amenities: string[];
  /** e.g. "Deluxe rooms available". */
  roomType?: string;
}

/** Apartment / whole-home stay. */
export interface Apartment extends BookableBase {
  vertical: "apartments";
  bedrooms: number;
  bathrooms: number;
  /** Max guests the unit sleeps. */
  guests: number;
  /** Floor area in m². */
  sizeSqm?: number;
}

/** Resort — star class + board and amenities. */
export interface Resort extends BookableBase {
  vertical: "resorts";
  stars: number;
  amenities: string[];
  /** e.g. "All inclusive", "Half board". */
  boardType?: string;
}

/** Shared / dorm room sold per bed. */
export interface SharedRoom extends BookableBase {
  vertical: "shared-rooms";
  /** Beds currently available. */
  bedsAvailable: number;
  /** e.g. "Mixed dorm", "Female dorm". */
  roomType: string;
  amenities: string[];
}

/** Convention hall / event venue. */
export interface ConventionHall extends BookableBase {
  vertical: "convention-hall";
  /** Max seated capacity. */
  capacity: number;
  /** Floor area in m². */
  areaSqm?: number;
  /** Supported layouts, e.g. ["Theatre", "Banquet"]. */
  layouts?: string[];
}

/** Transport service (coach, private car, ferry…). */
export interface Transport extends BookableBase {
  vertical: "transport";
  /** e.g. "Private car", "Luxury coach". */
  transportType: string;
  seats: number;
  route?: { from: string; to: string };
  durationHours?: number;
}

/** Multi-day tour package. */
export interface Tour extends BookableBase {
  vertical: "tours";
  durationDays: number;
  /** Max group size. */
  groupSize: number;
  /** e.g. "Adventure", "Cultural". */
  tourType?: string;
}

/** Single-session activity / experience. */
export interface Activity extends BookableBase {
  vertical: "activities";
  durationHours: number;
  category: string;
}

/** Visa processing service. */
export interface Visa extends BookableBase {
  vertical: "visa";
  /** Destination country the visa is for. */
  country: string;
  /** e.g. "7–10 business days". */
  processingTime: string;
  /** e.g. "90 days". */
  validity: string;
  /** e.g. "Single / Multiple entry". */
  entryType?: string;
}

/** Union of every bookable entity. */
export type Listing =
  | Hotel
  | Apartment
  | Resort
  | SharedRoom
  | ConventionHall
  | Transport
  | Tour
  | Activity
  | Visa;
