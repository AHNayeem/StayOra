/**
 * Details-template types. A {@link ListingDetail} is the rich, page-ready shape
 * the details template consumes — the base {@link Listing} plus the derived
 * editorial content (gallery, overview, specs, itinerary, FAQs, reviews).
 *
 * The service layer returns this shape today by *deriving* it from mock listings
 * (see `lib/listing-detail`), so a real API can later return the same object
 * without touching a single component.
 */

import type { Review } from "./booking";
import type { Listing } from "./catalog";

/** A single "at a glance" quick fact, e.g. { label: "Star rating", value: "5-star" }. */
export interface DetailSpec {
  label: string;
  value: string;
  /** Lucide icon name, resolved at render via the shared Icon component. */
  icon: string;
}

/** One question/answer pair for the FAQ accordion. */
export interface FaqItem {
  question: string;
  answer: string;
}

/** One step of an itinerary (a tour day, a transport leg, a process stage). */
export interface ItineraryStep {
  /** Short marker, e.g. "Day 1", "Step 2". */
  label: string;
  title: string;
  description: string;
}

/** Aggregate review stats shown beside the review list. */
export interface ReviewSummary {
  average: number;
  total: number;
  /** Count per star bucket, 5 → 1. */
  breakdown: { stars: number; count: number }[];
}

/**
 * The complete payload for one details page. Everything the template needs is
 * here — no component reaches back into raw mock data.
 */
export interface ListingDetail {
  listing: Listing;
  /** At least one image; the first is the hero. */
  gallery: string[];
  /** Overview paragraphs. */
  overview: string[];
  /** Bullet highlights ("What makes this special"). */
  highlights: string[];
  /** Amenities for stays; empty for verticals without them. */
  amenities: string[];
  /** What the price includes. */
  included: string[];
  /** What it does not include. */
  excluded: string[];
  /** Vertical-specific quick facts. */
  specs: DetailSpec[];
  /** Day-by-day / step-by-step plan; empty when not applicable. */
  itinerary: ItineraryStep[];
  faqs: FaqItem[];
  reviews: Review[];
  reviewSummary: ReviewSummary;
}
