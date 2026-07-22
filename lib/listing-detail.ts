/**
 * listing-detail.ts — the pure, deterministic builder that turns a bare
 * {@link Listing} into a page-ready {@link ListingDetail}. It derives gallery,
 * overview, specs, itinerary, FAQs and reviews from the listing's own typed
 * fields plus the editorial pools in `constants/detail`.
 *
 * Framework-free and side-effect-free — no React, no `Date.now`, no `Math.random`
 * (all "generated" content is slug-seeded so server and client render identically).
 * When a real API arrives it can return {@link ListingDetail} directly and this
 * builder simply falls away.
 */

import type { Review } from "@/types/booking";
import type { Listing } from "@/types/catalog";
import type {
  DetailSpec,
  ItineraryStep,
  ListingDetail,
  ReviewSummary,
} from "@/types/detail";
import { VERTICALS } from "@/constants/verticals";
import {
  FAQ_BY_VERTICAL,
  FAQ_COMMON,
  GALLERY_POOL,
  INCLUSIONS,
  ITINERARY_POOL,
  OVERVIEW_BLURB,
  REVIEW_POOL,
} from "@/constants/detail";

/** Small, stable string hash → non-negative int. Used to seed deterministic picks. */
function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0; // force 32-bit
  }
  return Math.abs(hash);
}

/** Build a gallery of up to 5 unique images, leading with the listing's own. */
function buildGallery(listing: Listing): string[] {
  const pool = [
    listing.image,
    ...(listing.gallery ?? []),
    ...GALLERY_POOL[listing.vertical],
  ];
  return Array.from(new Set(pool)).slice(0, 5);
}

/** Two overview paragraphs: a derived intro sentence + the vertical blurb. */
function buildOverview(listing: Listing): string[] {
  const { label } = VERTICALS[listing.vertical];
  const place = listing.location.label;
  const intro = `${listing.title} is a highly-rated ${label.toLowerCase()} in ${place}, chosen by travellers for its consistent quality and warm, professional service.`;
  return [intro, OVERVIEW_BLURB[listing.vertical]];
}

/** Vertical-specific quick facts, narrowing the discriminated union exhaustively. */
function buildSpecs(listing: Listing): DetailSpec[] {
  const specs: DetailSpec[] = [];

  switch (listing.vertical) {
    case "hotels":
      specs.push({ label: "Star rating", value: `${listing.stars}-star`, icon: "Star" });
      if (listing.roomType) specs.push({ label: "Rooms", value: listing.roomType, icon: "BedDouble" });
      specs.push({ label: "Amenities", value: `${listing.amenities.length}+ on-site`, icon: "Sparkles" });
      break;
    case "apartments":
      specs.push({ label: "Bedrooms", value: `${listing.bedrooms}`, icon: "BedDouble" });
      specs.push({ label: "Bathrooms", value: `${listing.bathrooms}`, icon: "Bath" });
      specs.push({ label: "Sleeps", value: `${listing.guests} guests`, icon: "Users" });
      if (listing.sizeSqm) specs.push({ label: "Size", value: `${listing.sizeSqm} m²`, icon: "Ruler" });
      break;
    case "resorts":
      specs.push({ label: "Star rating", value: `${listing.stars}-star`, icon: "Star" });
      if (listing.boardType) specs.push({ label: "Board", value: listing.boardType, icon: "Utensils" });
      specs.push({ label: "Amenities", value: `${listing.amenities.length}+ on-site`, icon: "Sparkles" });
      break;
    case "shared-rooms":
      specs.push({ label: "Room type", value: listing.roomType, icon: "BedDouble" });
      specs.push({ label: "Beds available", value: `${listing.bedsAvailable}`, icon: "Users" });
      specs.push({ label: "Amenities", value: `${listing.amenities.length}+ shared`, icon: "Sparkles" });
      break;
    case "convention-hall":
      specs.push({ label: "Capacity", value: `${listing.capacity} guests`, icon: "Users" });
      if (listing.areaSqm) specs.push({ label: "Floor area", value: `${listing.areaSqm} m²`, icon: "Maximize" });
      if (listing.layouts?.length) specs.push({ label: "Layouts", value: listing.layouts.join(", "), icon: "LayoutGrid" });
      break;
    case "transport":
      specs.push({ label: "Vehicle", value: listing.transportType, icon: "Car" });
      specs.push({ label: "Seats", value: `${listing.seats}`, icon: "Users" });
      if (listing.route) specs.push({ label: "Route", value: `${listing.route.from} → ${listing.route.to}`, icon: "Route" });
      if (listing.durationHours) specs.push({ label: "Duration", value: `${listing.durationHours}h`, icon: "Clock" });
      break;
    case "tours":
      specs.push({ label: "Duration", value: `${listing.durationDays} days`, icon: "CalendarDays" });
      specs.push({ label: "Group size", value: `Max ${listing.groupSize}`, icon: "Users" });
      if (listing.tourType) specs.push({ label: "Tour type", value: listing.tourType, icon: "Tag" });
      break;
    case "activities":
      specs.push({ label: "Duration", value: `${listing.durationHours}h`, icon: "Clock" });
      specs.push({ label: "Category", value: listing.category, icon: "Ticket" });
      break;
    case "visa":
      specs.push({ label: "Country", value: listing.country, icon: "Globe" });
      specs.push({ label: "Processing", value: listing.processingTime, icon: "Timer" });
      specs.push({ label: "Validity", value: listing.validity, icon: "CalendarCheck" });
      if (listing.entryType) specs.push({ label: "Entry", value: listing.entryType, icon: "FileText" });
      break;
  }

  specs.push({ label: "Location", value: listing.location.label, icon: "MapPin" });
  return specs;
}

/** Highlights: the listing's badges first, then a couple of derived selling points. */
function buildHighlights(listing: Listing): string[] {
  const highlights = [...(listing.badges ?? [])];

  switch (listing.vertical) {
    case "hotels":
    case "resorts":
      highlights.push(`${listing.stars}-star quality`, ...listing.amenities.slice(0, 2));
      break;
    case "apartments":
      highlights.push(`Sleeps up to ${listing.guests}`, `${listing.bedrooms}-bedroom private home`);
      break;
    case "shared-rooms":
      highlights.push(listing.roomType, ...listing.amenities.slice(0, 2));
      break;
    case "convention-hall":
      highlights.push(`Seats up to ${listing.capacity}`, "In-house AV & coordination");
      break;
    case "transport":
      highlights.push(`${listing.transportType} · ${listing.seats} seats`, "Professional driver");
      break;
    case "tours":
      highlights.push(`${listing.durationDays}-day itinerary`, "Expert local guide");
      break;
    case "activities":
      highlights.push(`${listing.durationHours}-hour experience`, "All equipment included");
      break;
    case "visa":
      highlights.push(`${listing.entryType ?? "Tourist"} · ${listing.validity}`, "Full document support");
      break;
  }

  if (listing.rating) highlights.push(`Rated ${listing.rating.toFixed(1)} by guests`);
  return Array.from(new Set(highlights));
}

/** Amenities list for verticals that carry one; empty otherwise. */
function buildAmenities(listing: Listing): string[] {
  switch (listing.vertical) {
    case "hotels":
    case "resorts":
    case "shared-rooms":
      return listing.amenities;
    default:
      return [];
  }
}

/** A day-by-day itinerary for tours; empty for every other vertical. */
function buildItinerary(listing: Listing): ItineraryStep[] {
  if (listing.vertical !== "tours") return [];
  const days = Math.max(1, Math.min(listing.durationDays, ITINERARY_POOL.length));
  return ITINERARY_POOL.slice(0, days).map((step, i) => ({
    label: `Day ${i + 1}`,
    title: step.title,
    description: step.description,
  }));
}

/** Deterministically pick reviews and clamp their ratings toward the listing's score. */
function buildReviews(listing: Listing): Review[] {
  const base = listing.rating ?? 4.6;
  const offset = hashString(listing.slug) % REVIEW_POOL.length;
  const count = 4;

  return Array.from({ length: count }, (_, i) => {
    const src = REVIEW_POOL[(offset + i) % REVIEW_POOL.length];
    // Nudge the pool rating toward this listing's score, clamped to 3–5.
    const rating = Math.max(3, Math.min(5, Math.round(base + (src.rating - 4.5))));
    return {
      id: `${listing.id}-rev-${i + 1}`,
      author: src.author,
      rating,
      date: src.date,
      platform: src.platform,
      body: src.body,
      location: src.location,
    };
  });
}

/** Aggregate summary: the listing's headline score + a plausible star breakdown. */
function buildReviewSummary(listing: Listing): ReviewSummary {
  const average = listing.rating ?? 4.6;
  const total = listing.reviewCount ?? 0;
  // Weight the distribution toward the top for high scores.
  const weights = average >= 4.7 ? [0.78, 0.16, 0.04, 0.01, 0.01] : [0.62, 0.24, 0.09, 0.03, 0.02];
  const breakdown = weights.map((w, i) => ({
    stars: 5 - i,
    count: Math.round(total * w),
  }));
  return { average, total, breakdown };
}

/**
 * Build the full details payload for a listing. Pure and deterministic — the
 * single place mock listings are enriched into page-ready content.
 */
export function buildListingDetail(listing: Listing): ListingDetail {
  const { included, excluded } = INCLUSIONS[listing.vertical];
  return {
    listing,
    gallery: buildGallery(listing),
    overview: buildOverview(listing),
    highlights: buildHighlights(listing),
    amenities: buildAmenities(listing),
    included,
    excluded,
    specs: buildSpecs(listing),
    itinerary: buildItinerary(listing),
    faqs: [...FAQ_COMMON, ...FAQ_BY_VERTICAL[listing.vertical]],
    reviews: buildReviews(listing),
    reviewSummary: buildReviewSummary(listing),
  };
}
