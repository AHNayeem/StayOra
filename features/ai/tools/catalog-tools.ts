/**
 * Catalog tools — stays, tours, activities, transport and visa services.
 *
 * Each one reads through {@link "@/services/catalog"} (and the global search
 * service for free-text), then ranks with pure, explainable scoring. Every
 * `reason` string is assembled from fields that exist on the listing, so an
 * answer can always be traced back to data the site itself shows.
 */

import type { ListingVertical } from "@/types/booking";
import type { Listing } from "@/types/catalog";
import type { ListingDetail } from "@/types/detail";
import type {
  AIComparisonRow,
  AIComparisonSubject,
  AIListingRef,
  AIReviewTheme,
  AITripStyle,
} from "@/types/ai";
import { listingHref } from "@/constants/verticals";
import { getRepositories } from "../repositories";
import { usd } from "../lib/money";
import { normalize } from "../lib/text";
import { countryOf, listingMatchesPlace, type AIPlace } from "../lib/places";

/* -------------------------------------------------------------------------- */
/* Shared shapes                                                               */
/* -------------------------------------------------------------------------- */

/** Result envelope every catalog tool returns. */
export interface AIListingResult {
  items: AIListingRef[];
  /** Total matches before the limit was applied. */
  total: number;
  /**
   * Constraints that had to be dropped to return anything. The assistant says
   * so out loud instead of silently pretending the filter was honoured.
   */
  relaxed: string[];
  /** The place actually searched, echoed back for the answer text. */
  place?: AIPlace;
  /**
   * Set when the city had nothing and the search widened to its country —
   * a real, nameable fallback the answer discloses ("nothing in Dubai itself;
   * here's what the UAE has") rather than a silent substitution.
   */
  widenedTo?: string;
}

/** Stay verticals, in the order the assistant prefers them by default. */
const STAY_VERTICALS: ListingVertical[] = ["hotels", "resorts", "apartments", "shared-rooms"];

/** Keywords that make a listing a good fit for a travel style. */
const STYLE_KEYWORDS: Record<AITripStyle, string[]> = {
  family: ["family", "kids club", "pool", "suite", "apartment", "connecting"],
  couple: ["romantic", "boutique", "spa", "sea-view", "sunset", "private"],
  solo: ["hostel", "dorm", "social", "central", "pod"],
  business: ["business center", "business", "wifi", "executive", "central", "conference"],
  luxury: ["spa", "5-star", "infinity pool", "suite", "private beach", "butler"],
  budget: ["hostel", "dorm", "great value", "budget"],
  beach: ["beach", "beachfront", "private beach", "sea-view", "ocean", "lagoon", "coral", "resort"],
  adventure: ["adventure", "diving", "safari", "trek", "water sports", "expedition"],
  culture: ["cultural", "historical", "museum", "old quarter", "heritage", "city walk"],
  airport: ["airport", "shuttle", "transfer", "airport shuttle"],
};

/** All searchable text for a listing, lowercased once per call. */
function haystack(listing: Listing): string {
  const parts: string[] = [
    listing.title,
    listing.location.label,
    ...(listing.badges ?? []),
  ];
  switch (listing.vertical) {
    case "hotels":
    case "resorts":
      parts.push(...listing.amenities);
      if ("roomType" in listing && listing.roomType) parts.push(listing.roomType);
      if ("boardType" in listing && listing.boardType) parts.push(listing.boardType);
      if (listing.stars) parts.push(`${listing.stars}-star`);
      break;
    case "shared-rooms":
      parts.push(listing.roomType, ...listing.amenities, "hostel", "dorm");
      break;
    case "apartments":
      parts.push("apartment", "whole home", `${listing.bedrooms} bedroom`);
      break;
    case "transport":
      parts.push(listing.transportType);
      if (listing.route) parts.push(listing.route.from, listing.route.to);
      break;
    case "tours":
      if (listing.tourType) parts.push(listing.tourType);
      break;
    case "activities":
      parts.push(listing.category);
      break;
    case "visa":
      parts.push(listing.country, listing.entryType ?? "", listing.validity);
      break;
    case "convention-hall":
      parts.push(...(listing.layouts ?? []));
      break;
  }
  return normalize(parts.join(" "));
}

/** Human "why this one" line, built only from fields the listing actually has. */
function buildReason(listing: Listing, nights?: number): string {
  const bits: string[] = [];
  if (listing.rating) bits.push(`${listing.rating.toFixed(1)}★`);
  switch (listing.vertical) {
    case "hotels":
    case "resorts":
      bits.push(`${listing.stars}-star`);
      if (listing.amenities.length) bits.push(listing.amenities.slice(0, 2).join(" · "));
      break;
    case "apartments":
      bits.push(`${listing.bedrooms}-bed · sleeps ${listing.guests}`);
      break;
    case "shared-rooms":
      bits.push(listing.roomType, `${listing.bedsAvailable} beds left`);
      break;
    case "tours":
      bits.push(`${listing.durationDays} days`, listing.tourType ?? "");
      break;
    case "activities":
      bits.push(`${listing.durationHours}h`, listing.category);
      break;
    case "transport":
      bits.push(listing.transportType, `${listing.seats} seats`);
      break;
    case "visa":
      bits.push(listing.processingTime, listing.validity);
      break;
    case "convention-hall":
      bits.push(`seats ${listing.capacity}`);
      break;
  }
  if (nights && nights > 0 && isPerNight(listing)) {
    bits.push(`${nights} nights`);
  }
  return bits.filter(Boolean).join(" · ");
}

/** Whether this vertical's price is quoted per night (so a stay total exists). */
function isPerNight(listing: Listing): boolean {
  return (
    listing.vertical === "hotels" ||
    listing.vertical === "resorts" ||
    listing.vertical === "apartments" ||
    listing.vertical === "shared-rooms"
  );
}

/** Wrap a listing into the reference shape the UI renders. */
export function toRef(listing: Listing, nights?: number): AIListingRef {
  const perNight = isPerNight(listing);
  return {
    listing,
    href: listingHref(listing),
    reason: buildReason(listing, nights),
    ...(perNight && nights && nights > 0
      ? { totalUsd: listing.price.amount * nights, nights }
      : {}),
  };
}

/* -------------------------------------------------------------------------- */
/* Stay search                                                                 */
/* -------------------------------------------------------------------------- */

export interface StaySearchInput {
  place?: AIPlace;
  /** Per-night ceiling in base USD. */
  maxNightlyUsd?: number;
  minRating?: number;
  /** Amenity keywords the traveller named. */
  amenities?: string[];
  /** Restrict to one stay vertical when the traveller was specific. */
  vertical?: ListingVertical;
  styles?: AITripStyle[];
  /** Nights, so the tool can return a stay total alongside the nightly rate. */
  nights?: number;
  limit?: number;
}

/**
 * searchHotels — rank stays for a destination and set of preferences.
 *
 * Constraints are relaxed in a deliberate order, weakest first, and every drop
 * is recorded in `relaxed` so the assistant can say what it couldn't honour
 * instead of quietly returning something that breaks the ask.
 *
 * **Destination is relaxed last, and property type before it.** Somebody asking
 * for "a hotel in Dubai" wants Dubai; if the catalog has resorts and hostels
 * there but no hotel rows, the right answer is a Dubai resort, not a hotel in
 * Vienna. Getting this order wrong is the difference between a concierge and a
 * search box that ignores you.
 */
export async function searchHotels(input: StaySearchInput): Promise<AIListingResult> {
  const requested = input.vertical ? [input.vertical] : STAY_VERTICALS;
  const relaxed: string[] = [];

  const repo = getRepositories().listings;
  const pools = await Promise.all(STAY_VERTICALS.map((v) => repo.listByVertical(v)));
  const everyStay = pools.flat();
  const inRequestedVertical = everyStay.filter((l) => requested.includes(l.vertical));

  let pool = inRequestedVertical;
  let widenedTo: string | undefined;

  if (input.place) {
    const place = input.place;
    const matches = (list: Listing[], target: AIPlace) =>
      list.filter((l) => listingMatchesPlace(l.location, target));

    const inPlace = matches(inRequestedVertical, place);
    if (inPlace.length > 0) {
      pool = inPlace;
    } else {
      // 1. Widen the property type before giving up on the destination.
      const anyStayInPlace = matches(everyStay, place);
      const country = countryOf(place);
      const anyStayInCountry = country ? matches(everyStay, country) : [];

      if (anyStayInPlace.length > 0) {
        pool = anyStayInPlace;
        if (input.vertical) relaxed.push(`${input.vertical.replace("-", " ")} specifically`);
      } else if (anyStayInCountry.length > 0 && country) {
        // 2. Then widen one step geographically — still a real, nameable answer.
        pool = anyStayInCountry;
        widenedTo = country.label;
      } else {
        // 3. Only now admit the destination can't be served at all.
        pool = inRequestedVertical;
        relaxed.push(`destination ${place.label}`);
      }
    }
  }

  if (input.maxNightlyUsd !== undefined) {
    const affordable = pool.filter((l) => l.price.amount <= input.maxNightlyUsd!);
    if (affordable.length > 0) pool = affordable;
    else relaxed.push(`budget under ${usd(input.maxNightlyUsd)} a night`);
  }

  if (input.minRating !== undefined) {
    const rated = pool.filter((l) => (l.rating ?? 0) >= input.minRating!);
    if (rated.length > 0) pool = rated;
    else relaxed.push(`${input.minRating}+ rating`);
  }

  const wanted = (input.amenities ?? []).map(normalize).filter(Boolean);
  const styleWords = (input.styles ?? []).flatMap((s) => STYLE_KEYWORDS[s] ?? []).map(normalize);

  const scored = pool.map((listing) => {
    const text = haystack(listing);
    let score = (listing.rating ?? 4) * 2;
    if (listing.featured) score += 1.5;

    let amenityHits = 0;
    for (const word of wanted) if (text.includes(word)) amenityHits += 1;
    score += amenityHits * 4;

    let styleHits = 0;
    for (const word of styleWords) if (text.includes(word)) styleHits += 1;
    score += Math.min(styleHits, 4) * 1.5;

    // Prefer real value: a discounted rate is a fact on the listing.
    if (listing.price.original && listing.price.original > listing.price.amount) score += 1;
    return { listing, score, amenityHits };
  });

  // A traveller who names amenities means them: put full matches first.
  scored.sort(
    (a, b) =>
      b.amenityHits - a.amenityHits ||
      b.score - a.score ||
      a.listing.price.amount - b.listing.price.amount,
  );

  const limit = input.limit ?? 3;
  return {
    items: scored.slice(0, limit).map((s) => toRef(s.listing, input.nights)),
    total: scored.length,
    relaxed,
    place: input.place,
    widenedTo,
  };
}

/* -------------------------------------------------------------------------- */
/* Tours, activities, transport, visa services                                 */
/* -------------------------------------------------------------------------- */

export interface ExperienceSearchInput {
  place?: AIPlace;
  /** Per-person ceiling in base USD. */
  maxUsd?: number;
  styles?: AITripStyle[];
  limit?: number;
}

/** Generic ranked lookup for the experience verticals. */
async function searchExperience(
  vertical: ListingVertical,
  input: ExperienceSearchInput,
): Promise<AIListingResult> {
  const all = await getRepositories().listings.listByVertical(vertical);
  let pool = all;
  const relaxed: string[] = [];
  let widenedTo: string | undefined;

  if (input.place) {
    const place = input.place;
    const inPlace = all.filter((l) => listingMatchesPlace(l.location, place));
    if (inPlace.length > 0) {
      pool = inPlace;
    } else {
      // Widen to the country before abandoning the destination — "elsewhere in
      // Indonesia" is still an answer to "what's near Bali"; Reykjavík isn't.
      const country = countryOf(place);
      const inCountry = country ? all.filter((l) => listingMatchesPlace(l.location, country)) : [];
      if (inCountry.length > 0 && country) {
        pool = inCountry;
        widenedTo = country.label;
      } else {
        relaxed.push(`destination ${place.label}`);
      }
    }
  }

  if (input.maxUsd !== undefined) {
    const affordable = pool.filter((l) => l.price.amount <= input.maxUsd!);
    if (affordable.length > 0) pool = affordable;
    else relaxed.push(`under ${usd(input.maxUsd)}`);
  }

  const styleWords = (input.styles ?? []).flatMap((s) => STYLE_KEYWORDS[s] ?? []).map(normalize);
  const scored = pool.map((listing) => {
    const text = haystack(listing);
    let score = (listing.rating ?? 4) * 2;
    if (listing.featured) score += 1.5;
    for (const word of styleWords) if (text.includes(word)) score += 2;
    return { listing, score };
  });
  scored.sort((a, b) => b.score - a.score || a.listing.price.amount - b.listing.price.amount);

  const limit = input.limit ?? 3;
  return {
    items: scored.slice(0, limit).map((s) => toRef(s.listing)),
    total: scored.length,
    relaxed,
    place: input.place,
    widenedTo,
  };
}

export const searchTours = (input: ExperienceSearchInput) => searchExperience("tours", input);
export const searchActivities = (input: ExperienceSearchInput) =>
  searchExperience("activities", input);
export const searchTransport = (input: ExperienceSearchInput) =>
  searchExperience("transport", input);
export const searchVisaServices = (input: ExperienceSearchInput) =>
  searchExperience("visa", input);

/**
 * getRecommendations — what to look at when the traveller hasn't decided.
 * Mixes the strongest stay with the strongest experiences for a place.
 */
export async function getRecommendations(input: {
  place?: AIPlace;
  styles?: AITripStyle[];
  limit?: number;
}): Promise<AIListingResult> {
  const limit = input.limit ?? 4;
  const [stays, activities, tours] = await Promise.all([
    searchHotels({ place: input.place, styles: input.styles, limit: 2 }),
    searchActivities({ place: input.place, styles: input.styles, limit: 1 }),
    searchTours({ place: input.place, styles: input.styles, limit: 1 }),
  ]);
  const items = [...stays.items, ...activities.items, ...tours.items].slice(0, limit);
  return {
    items,
    total: stays.total + activities.total + tours.total,
    relaxed: [...new Set([...stays.relaxed, ...activities.relaxed, ...tours.relaxed])],
    place: input.place,
  };
}

/* -------------------------------------------------------------------------- */
/* Details, comparison and reviews                                             */
/* -------------------------------------------------------------------------- */

/** getListingDetails — full details payload for one listing. */
export function getListingDetails(
  vertical: ListingVertical,
  slug: string,
): Promise<ListingDetail | undefined> {
  return getRepositories().listings.getDetail(vertical, slug);
}

/** Resolve listing ids back to listings across every stay/experience vertical. */
export async function resolveListings(ids: string[]): Promise<Listing[]> {
  return getRepositories().listings.getManyByIds(ids);
}

/** A comparison table plus the recommendation the numbers support. */
export interface AIComparison {
  subjects: AIComparisonSubject[];
  rows: AIComparisonRow[];
  recommendation: string;
}

/**
 * compareListings — a structured, side-by-side view of 2–4 stays.
 *
 * The recommendation is derived by scoring the *same* fields the table shows
 * (value per night against rating, amenity count, free cancellation), so the
 * table always justifies the verdict.
 */
export async function compareListings(
  ids: string[],
  nights = 1,
): Promise<AIComparison | undefined> {
  const listings = (await resolveListings(ids)).slice(0, 4);
  if (listings.length < 2) return undefined;

  const subjects: AIComparisonSubject[] = listings.map((l) => ({
    id: l.id,
    title: l.title,
    subtitle: l.location.label,
    href: listingHref(l),
    image: l.image,
  }));

  const nightsFactor = Math.max(1, nights);
  const priceValues = listings.map((l) => l.price.amount);
  const ratingValues = listings.map((l) => l.rating ?? 0);
  const amenityCounts = listings.map(amenitiesOf).map((a) => a.length);
  const cancellation = listings.map((l) =>
    (l.badges ?? []).some((b) => /cancel/i.test(b)) ? "Free cancellation" : "Standard policy",
  );
  const breakfast = listings.map((l) => {
    const text = haystack(l);
    if (text.includes("breakfast") || text.includes("all inclusive")) return "Included";
    return "Not included";
  });

  const rows: AIComparisonRow[] = [
    {
      label: "Price per night",
      values: priceValues.map((v) => usd(v)),
      bestIndex: indexOfMin(priceValues),
    },
    {
      label: `Total · ${nightsFactor} ${nightsFactor === 1 ? "night" : "nights"}`,
      values: priceValues.map((v) => usd(v * nightsFactor)),
      bestIndex: indexOfMin(priceValues),
    },
    {
      label: "Guest rating",
      values: listings.map((l) =>
        l.rating ? `${l.rating.toFixed(1)} / 5 (${(l.reviewCount ?? 0).toLocaleString()})` : "—",
      ),
      bestIndex: indexOfMax(ratingValues),
    },
    {
      label: "Class",
      values: listings.map((l) =>
        l.vertical === "hotels" || l.vertical === "resorts" ? `${l.stars}-star` : "—",
      ),
    },
    { label: "Location", values: listings.map((l) => l.location.label) },
    {
      label: "Amenities",
      values: listings.map((l) => {
        const a = amenitiesOf(l);
        return a.length ? a.slice(0, 4).join(", ") : "—";
      }),
      bestIndex: indexOfMax(amenityCounts),
    },
    { label: "Breakfast", values: breakfast },
    { label: "Cancellation", values: cancellation },
    {
      label: "Value score",
      values: listings.map((l) => `${valueScore(l).toFixed(1)} / 10`),
      bestIndex: indexOfMax(listings.map(valueScore)),
    },
  ];

  const winner = listings.reduce((best, l) => (valueScore(l) > valueScore(best) ? l : best));
  const cheapest = listings.reduce((best, l) =>
    l.price.amount < best.price.amount ? l : best,
  );
  const topRated = listings.reduce((best, l) =>
    (l.rating ?? 0) > (best.rating ?? 0) ? l : best,
  );

  const parts = [
    `${winner.title} is the strongest overall — ${winner.rating?.toFixed(1) ?? "—"}★ at ${usd(winner.price.amount)} a night.`,
  ];
  if (cheapest.id !== winner.id) {
    const delta = (winner.price.amount - cheapest.price.amount) * nightsFactor;
    parts.push(
      `${cheapest.title} saves ${usd(delta)} over ${nightsFactor} ${nightsFactor === 1 ? "night" : "nights"} if price leads.`,
    );
  }
  if (topRated.id !== winner.id) {
    parts.push(`${topRated.title} rates highest with guests (${topRated.rating?.toFixed(1)}★).`);
  }

  return { subjects, rows, recommendation: parts.join(" ") };
}

/** Amenity list for verticals that carry one. */
function amenitiesOf(listing: Listing): string[] {
  switch (listing.vertical) {
    case "hotels":
    case "resorts":
    case "shared-rooms":
      return listing.amenities;
    default:
      return [];
  }
}

/**
 * Value score out of 10 — rating weighted against price within the compared
 * set, nudged by amenity breadth. Comparative only; never shown as an absolute.
 */
function valueScore(listing: Listing): number {
  const rating = listing.rating ?? 4;
  const price = Math.max(1, listing.price.amount);
  const amenityBonus = Math.min(amenitiesOf(listing).length, 6) * 0.15;
  const discount =
    listing.price.original && listing.price.original > price
      ? (listing.price.original - price) / listing.price.original
      : 0;
  // Rating per $100 of nightly rate, clamped into a readable 0–10 range.
  const raw = (rating / price) * 100 + amenityBonus + discount * 2;
  return Math.max(0, Math.min(10, raw));
}

function indexOfMin(values: number[]): number {
  return values.reduce((best, v, i) => (v < values[best] ? i : best), 0);
}
function indexOfMax(values: number[]): number {
  return values.reduce((best, v, i) => (v > values[best] ? i : best), 0);
}

/** Words worth counting when mining review themes. */
const REVIEW_THEMES: Array<{ label: string; words: string[] }> = [
  { label: "Staff & service", words: ["staff", "service", "host", "team", "helpful", "friendly"] },
  { label: "Cleanliness", words: ["clean", "spotless", "tidy", "immaculate"] },
  { label: "Location", words: ["location", "central", "walk", "close", "nearby"] },
  { label: "Value for money", words: ["value", "worth", "price", "cheap", "affordable"] },
  { label: "Comfort", words: ["comfortable", "bed", "quiet", "spacious", "cosy", "cozy"] },
  { label: "Food & breakfast", words: ["breakfast", "food", "restaurant", "dinner", "meal"] },
  { label: "Views", words: ["view", "sunset", "sea", "ocean", "scenery"] },
  { label: "Facilities", words: ["pool", "spa", "gym", "wifi", "parking", "facilities"] },
];

/**
 * summarizeReviews — themes counted from the listing's real review text.
 *
 * Nothing is generated: a theme only appears if the words actually occur, and
 * the mention count is the number of reviews containing them.
 */
export async function summarizeReviews(vertical: ListingVertical, slug: string) {
  const detail = await getRepositories().listings.getDetail(vertical, slug);
  if (!detail) return undefined;

  const bodies = detail.reviews.map((r) => normalize(r.body));
  const themes: AIReviewTheme[] = REVIEW_THEMES.map((theme) => {
    const mentions = bodies.filter((body) => theme.words.some((w) => body.includes(w))).length;
    return {
      label: theme.label,
      mentions,
      sentiment: detail.reviewSummary.average >= 4.3 ? ("positive" as const) : ("mixed" as const),
    };
  })
    .filter((t) => t.mentions > 0)
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 5);

  // Lead with the highest-rated reviews — those are the ones travellers scan.
  const quotes = [...detail.reviews].sort((a, b) => b.rating - a.rating).slice(0, 2);

  return {
    detail,
    themes,
    quotes,
    href: listingHref(detail.listing),
  };
}
