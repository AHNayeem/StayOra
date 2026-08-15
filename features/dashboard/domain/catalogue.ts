/**
 * The catalogue approval workflow — the join that was missing between "a
 * merchant created a product" and "the public site sells it".
 *
 * A catalogue item is split in two on purpose:
 *
 *   static    — what the product *is* (title, vertical, price, owner). For the
 *               listings that ship with the prototype this is read straight from
 *               `constants/listings`, so the marketing catalogue is **not
 *               duplicated** into a second array; merchant-created products keep
 *               their static half in the store.
 *   workflow  — where the product is in review (status, reviewer, timeline).
 *               Always in the store, for both kinds.
 *
 * `services/catalog.ts` (the public site) filters through {@link isListingLive},
 * so an unpublished or rejected item disappears from the storefront without any
 * component knowing this file exists.
 */

import type { BookingVertical } from "@/types/booking";
import type { Listing } from "@/types/catalog";
import {
  ACTIVITIES,
  APARTMENTS,
  CONVENTION_HALLS,
  HOTELS,
  RESORTS,
  SHARED_ROOMS,
  TOURS,
  TRANSPORT,
  VISAS,
} from "@/constants/listings";
import { hashString } from "@/lib/random";
import { MERCHANTS_SEED } from "./seed-merchants";
import { canTrade } from "./merchants";

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export const CATALOGUE_STATUS_VALUES = [
  "draft",
  "submitted",
  "under_review",
  "action_required",
  "rejected",
  "approved",
  "published",
  "unpublished",
  "archived",
] as const;

export type CatalogueStatus = (typeof CATALOGUE_STATUS_VALUES)[number];

export const CATALOGUE_STATUS_LABELS: Record<CatalogueStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  action_required: "Changes requested",
  rejected: "Rejected",
  approved: "Approved",
  published: "Published",
  unpublished: "Unpublished",
  archived: "Archived",
};

export const CATALOGUE_STATUS_TONES: Record<
  CatalogueStatus,
  "neutral" | "info" | "success" | "warning" | "danger"
> = {
  draft: "neutral",
  submitted: "info",
  under_review: "info",
  action_required: "warning",
  rejected: "danger",
  approved: "success",
  published: "success",
  unpublished: "neutral",
  archived: "neutral",
};

/**
 * Legal moves.
 *
 * `approved → published` is a separate step so a merchant controls *when* an
 * approved product goes live, and `published → unpublished → submitted` is how
 * a live product is edited without silently changing what customers already see.
 */
export const CATALOGUE_TRANSITIONS: Record<CatalogueStatus, readonly CatalogueStatus[]> = {
  draft: ["submitted", "archived"],
  submitted: ["under_review", "approved", "action_required", "rejected"],
  under_review: ["approved", "action_required", "rejected"],
  action_required: ["submitted", "archived"],
  rejected: ["draft", "archived"],
  approved: ["published", "action_required", "archived"],
  published: ["unpublished", "action_required"],
  unpublished: ["published", "submitted", "archived"],
  archived: ["draft"],
};

export function canTransitionCatalogue(from: CatalogueStatus, to: CatalogueStatus): boolean {
  return CATALOGUE_TRANSITIONS[from].includes(to);
}

/** Only these are visible to customers. */
export const LIVE_CATALOGUE_STATUSES: readonly CatalogueStatus[] = ["published"];

/** Statuses a merchant is waiting on the platform for. */
export const IN_REVIEW_STATUSES: readonly CatalogueStatus[] = ["submitted", "under_review"];

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

export interface CatalogueEvent {
  id: string;
  at: string;
  status: CatalogueStatus;
  label: string;
  actor: string;
  note?: string;
}

/** The review half of an item. Always stored. */
export interface CatalogueWorkflow {
  status: CatalogueStatus;
  /** Incremented on every resubmission, so a reviewer sees which pass this is. */
  version: number;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  /** Reviewer feedback — the reason for `action_required` or `rejected`. */
  reviewNote?: string;
  publishedAt?: string;
  unpublishedAt?: string;
  timeline: CatalogueEvent[];
}

/** The product half of an item. */
export interface CatalogueStatic {
  id: string;
  merchantId: string;
  /** Property this product is operated from, when the merchant has one. */
  propertyId?: string;
  vertical: BookingVertical;
  title: string;
  slug: string;
  summary: string;
  city: string;
  country: string;
  /** Headline price, USD. */
  basePrice: number;
  currency: string;
  image: string;
  /**
   * `seed` items come from the prototype's marketing catalogue and are read
   * from `constants/listings`; `merchant` items were created in the dashboard.
   */
  origin: "seed" | "merchant";
}

export type CatalogueItem = CatalogueStatic &
  CatalogueWorkflow & {
    merchantName: string;
  };

/** What a merchant fills in to create or edit a product. */
export interface CatalogueDraftInput {
  title: string;
  vertical: BookingVertical;
  propertyId?: string;
  summary: string;
  city: string;
  country: string;
  basePrice: number;
  image?: string;
}

// ---------------------------------------------------------------------------
// The seeded catalogue (derived from the marketing listings — never copied)
// ---------------------------------------------------------------------------

const BY_VERTICAL: Record<BookingVertical, Listing[]> = {
  hotels: HOTELS,
  apartments: APARTMENTS,
  resorts: RESORTS,
  "shared-rooms": SHARED_ROOMS,
  "convention-hall": CONVENTION_HALLS,
  flights: [],
  transport: TRANSPORT,
  tours: TOURS,
  activities: ACTIVITIES,
  visa: VISAS,
};

/**
 * Merchants that may own a listing in each vertical, derived from the merchant
 * roster rather than a second hand-written map — add a vertical to a merchant
 * and listings start being attributed to them.
 */
export function merchantIdsForVertical(vertical: BookingVertical): string[] {
  const ids = MERCHANTS_SEED.filter(
    (m) => canTrade(m) && m.verticals.includes(vertical),
  ).map((m) => m.id);
  return ids.length ? ids : MERCHANTS_SEED.filter(canTrade).map((m) => m.id);
}

/** The merchant that owns a listing. Stable for a given listing id. */
export function merchantIdForListing(listing: Pick<Listing, "id" | "vertical">): string {
  const ids = merchantIdsForVertical(listing.vertical);
  return ids[hashString(listing.id) % ids.length];
}

function staticFromListing(listing: Listing): CatalogueStatic {
  return {
    id: listing.id,
    merchantId: merchantIdForListing(listing),
    vertical: listing.vertical,
    title: listing.title,
    slug: listing.slug,
    // A launch listing has no description field of its own (the marketing
    // detail page generates one), so compose the summary the review screens
    // need from what the listing actually carries.
    summary: [
      `${listing.title} in ${listing.location.label}.`,
      listing.badges?.length ? listing.badges.slice(0, 3).join(" · ") : "",
    ]
      .filter(Boolean)
      .join(" "),
    city: listing.location.city ?? listing.location.label,
    country: listing.location.country ?? "",
    basePrice: listing.price.amount,
    currency: "USD",
    image: listing.image,
    origin: "seed",
  };
}

let seededStatics: CatalogueStatic[] | null = null;

/** Every marketing listing, as a catalogue record. Built once, then cached. */
export function seedCatalogueStatics(): CatalogueStatic[] {
  seededStatics ??= Object.values(BY_VERTICAL)
    .flat()
    .map(staticFromListing);
  return seededStatics;
}

let seededById: Map<string, CatalogueStatic> | null = null;

export function seedCatalogueStatic(id: string): CatalogueStatic | undefined {
  seededById ??= new Map(seedCatalogueStatics().map((s) => [s.id, s]));
  return seededById.get(id);
}

/**
 * The default workflow state for a listing that shipped with the prototype:
 * already reviewed and live, so today's storefront is unchanged.
 */
export function publishedWorkflow(at = "2026-05-01T09:00:00.000Z"): CatalogueWorkflow {
  return {
    status: "published",
    version: 1,
    createdAt: at,
    updatedAt: at,
    submittedAt: at,
    reviewedAt: at,
    reviewedBy: "Catalogue Team",
    publishedAt: at,
    timeline: [
      {
        id: "seedev-1",
        at,
        status: "published",
        label: "Published",
        actor: "Catalogue Team",
        note: "Imported with the launch catalogue.",
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Progress roll-ups
// ---------------------------------------------------------------------------

export interface CatalogueCounts {
  total: number;
  draft: number;
  submitted: number;
  underReview: number;
  actionRequired: number;
  rejected: number;
  approved: number;
  published: number;
  unpublished: number;
}

export function countCatalogue(items: CatalogueItem[]): CatalogueCounts {
  const counts: CatalogueCounts = {
    total: items.length,
    draft: 0,
    submitted: 0,
    underReview: 0,
    actionRequired: 0,
    rejected: 0,
    approved: 0,
    published: 0,
    unpublished: 0,
  };
  for (const item of items) {
    switch (item.status) {
      case "draft":
        counts.draft += 1;
        break;
      case "submitted":
        counts.submitted += 1;
        break;
      case "under_review":
        counts.underReview += 1;
        break;
      case "action_required":
        counts.actionRequired += 1;
        break;
      case "rejected":
        counts.rejected += 1;
        break;
      case "approved":
        counts.approved += 1;
        break;
      case "published":
        counts.published += 1;
        break;
      case "unpublished":
        counts.unpublished += 1;
        break;
      default:
        break;
    }
  }
  return counts;
}

/** The shape {@link import("./merchants").onboardingChecklist} consumes. */
export function catalogueProgress(items: CatalogueItem[]) {
  const c = countCatalogue(items);
  return {
    submitted: c.submitted + c.underReview,
    approved: c.approved,
    published: c.published,
    rejected: c.rejected + c.actionRequired,
  };
}

// ---------------------------------------------------------------------------
// Projection to the storefront
// ---------------------------------------------------------------------------

/**
 * A merchant-created product as a marketing {@link Listing}.
 *
 * This is what makes "create → submit → approve → publish" end on the public
 * site rather than in the dashboard. Vertical-specific fields the merchant form
 * doesn't collect get honest defaults — a new listing shows what is known about
 * it, not invented detail.
 */
export function toListing(item: CatalogueItem): Listing {
  const base = {
    id: item.id,
    slug: item.slug,
    title: item.title,
    image: item.image,
    location: { label: `${item.city}, ${item.country}`, city: item.city, country: item.country },
    price: { amount: item.basePrice, unit: unitFor(item.vertical) },
    // A brand-new listing has no reviews; the cards handle the absence.
    badges: ["New listing"],
    featured: false,
  };

  switch (item.vertical) {
    case "apartments":
      return { ...base, vertical: "apartments", bedrooms: 1, bathrooms: 1, guests: 2 };
    case "resorts":
      return { ...base, vertical: "resorts", stars: 4, amenities: [] };
    case "shared-rooms":
      return { ...base, vertical: "shared-rooms", bedsAvailable: 1, roomType: "Mixed dorm", amenities: [] };
    case "convention-hall":
      return { ...base, vertical: "convention-hall", capacity: 100 };
    case "transport":
      return { ...base, vertical: "transport", transportType: "Private transfer", seats: 4 };
    case "tours":
      return { ...base, vertical: "tours", durationDays: 1, groupSize: 12 };
    case "activities":
      return { ...base, vertical: "activities", durationHours: 2, category: "Experience" };
    case "visa":
      return {
        ...base,
        vertical: "visa",
        country: item.country,
        processingTime: "7–10 business days",
        validity: "90 days",
      };
    case "flights":
    case "hotels":
    default:
      return { ...base, vertical: "hotels", stars: 3, amenities: [] };
  }
}

function unitFor(vertical: BookingVertical): string {
  switch (vertical) {
    case "shared-rooms":
      return "per bed";
    case "convention-hall":
      return "per day";
    case "transport":
      return "per trip";
    case "tours":
    case "activities":
      return "per person";
    case "visa":
      return "per application";
    default:
      return "per night";
  }
}

/** Validation for a submission — the same rules the form shows and the service enforces. */
export function catalogueSubmissionProblems(item: CatalogueItem): string[] {
  const problems: string[] = [];
  if (item.title.trim().length < 4) problems.push("Give the product a title of at least 4 characters.");
  if (item.summary.trim().length < 20)
    problems.push("Write a description of at least 20 characters.");
  if (!item.city.trim()) problems.push("Add the city the product operates in.");
  if (!item.country.trim()) problems.push("Add the country.");
  if (!(item.basePrice > 0)) problems.push("Set a price above zero.");
  if (!item.image) problems.push("Add a cover image.");
  return problems;
}
