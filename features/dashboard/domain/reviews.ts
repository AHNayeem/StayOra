/**
 * Reviews & reputation.
 *
 * Eligibility is a domain rule, not a UI one: only a *completed* booking earns
 * the right to review, and only once. That makes every review here a verified
 * stay by construction, and it is why moderation, the property reply and the
 * public rating breakdown can all read from one collection.
 */

import type { BookingVertical } from "@/types/booking";
import { getState, mutate, nextId } from "./store";
import type { Booking, DomainActor } from "./types";

export type ReviewStatus = "pending" | "published" | "rejected" | "removed";

/** The sub-scores a stay is rated on. */
export const REVIEW_ASPECTS = [
  "cleanliness",
  "location",
  "service",
  "value",
  "comfort",
] as const;

export type ReviewAspect = (typeof REVIEW_ASPECTS)[number];

export const ASPECT_LABELS: Record<ReviewAspect, string> = {
  cleanliness: "Cleanliness",
  location: "Location",
  service: "Service",
  value: "Value for money",
  comfort: "Comfort",
};

export interface ReviewPhoto {
  id: string;
  url: string;
  caption?: string;
}

export interface PlatformReview {
  id: string;
  listingId: string;
  listingSlug: string;
  listingTitle: string;
  vertical: BookingVertical;
  merchantId: string;
  merchantName: string;
  bookingId: string;
  bookingRef: string;
  customerEmail: string;
  authorName: string;
  authorAvatar?: string;
  /** Overall 1–5, the average of `aspects` when they were supplied. */
  rating: number;
  aspects: Partial<Record<ReviewAspect, number>>;
  title: string;
  body: string;
  photos: ReviewPhoto[];
  /** Always true here — see the module note. */
  verifiedStay: boolean;
  stayedAt: string;
  createdAt: string;
  status: ReviewStatus;
  helpful: number;
  reports: { by: string; reason: string; at: string }[];
  response?: { authorName: string; body: string; at: string };
  moderation?: { by: string; at: string; note?: string };
}

export interface ReviewSummary {
  count: number;
  average: number;
  /** Count per whole star, index 0 = 1★. */
  distribution: number[];
  aspects: { aspect: ReviewAspect; label: string; score: number }[];
  withPhotos: number;
  responded: number;
}

function published(rows: PlatformReview[]): PlatformReview[] {
  return rows.filter((r) => r.status === "published");
}

export interface ReviewEligibility {
  eligible: boolean;
  reason?: string;
  booking?: Booking;
}

export const reviewService = {
  all(scope: { merchantId?: string } = {}): PlatformReview[] {
    return getState()
      .reviews.filter((r) => !scope.merchantId || r.merchantId === scope.merchantId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  /** Public reviews for one listing, newest first. */
  forListing(listingSlug: string): PlatformReview[] {
    return published(getState().reviews.filter((r) => r.listingSlug === listingSlug)).sort(
      (a, b) => b.createdAt.localeCompare(a.createdAt),
    );
  },

  forCustomer(email: string): PlatformReview[] {
    const key = email.toLowerCase();
    return getState()
      .reviews.filter((r) => r.customerEmail.toLowerCase() === key)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  get(id: string): PlatformReview | undefined {
    return getState().reviews.find((r) => r.id === id);
  },

  summary(listingSlug: string): ReviewSummary {
    const rows = reviewService.forListing(listingSlug);
    const distribution = [0, 0, 0, 0, 0];
    for (const row of rows) {
      const bucket = Math.min(4, Math.max(0, Math.round(row.rating) - 1));
      distribution[bucket] += 1;
    }
    const aspects = REVIEW_ASPECTS.map((aspect) => {
      const scores = rows.map((r) => r.aspects[aspect]).filter((n): n is number => n != null);
      return {
        aspect,
        label: ASPECT_LABELS[aspect],
        score: scores.length
          ? Math.round((scores.reduce((s, n) => s + n, 0) / scores.length) * 10) / 10
          : 0,
      };
    });

    return {
      count: rows.length,
      average: rows.length
        ? Math.round((rows.reduce((s, r) => s + r.rating, 0) / rows.length) * 10) / 10
        : 0,
      distribution,
      aspects,
      withPhotos: rows.filter((r) => r.photos.length > 0).length,
      responded: rows.filter((r) => r.response).length,
    };
  },

  /**
   * Can this booking be reviewed? Completed bookings only, one review each —
   * the rule that makes every review a verified stay.
   */
  eligibility(booking: Booking | undefined): ReviewEligibility {
    if (!booking) return { eligible: false, reason: "Booking not found." };
    if (booking.status !== "completed") {
      return {
        eligible: false,
        reason: "You can review a stay once it's completed.",
        booking,
      };
    }
    const existing = getState().reviews.some((r) => r.bookingId === booking.id);
    if (existing) {
      return { eligible: false, reason: "You've already reviewed this stay.", booking };
    }
    return { eligible: true, booking };
  },

  /** Bookings the customer can still review. */
  pendingInvitations(email: string): Booking[] {
    const key = email.toLowerCase();
    const reviewed = new Set(getState().reviews.map((r) => r.bookingId));
    return getState()
      .bookings.filter(
        (b) =>
          b.customer.email.toLowerCase() === key &&
          b.status === "completed" &&
          !reviewed.has(b.id),
      )
      .sort((a, b) => b.endAt.localeCompare(a.endAt));
  },

  create(
    input: {
      booking: Booking;
      listingId: string;
      listingSlug: string;
      vertical: BookingVertical;
      authorName: string;
      authorAvatar?: string;
      title: string;
      body: string;
      aspects: Partial<Record<ReviewAspect, number>>;
      photos?: ReviewPhoto[];
    },
    at = new Date().toISOString(),
  ): PlatformReview {
    const scores = Object.values(input.aspects).filter((n): n is number => n != null);
    const rating = scores.length
      ? Math.round((scores.reduce((s, n) => s + n, 0) / scores.length) * 10) / 10
      : 5;

    const review: PlatformReview = {
      id: nextId("rev"),
      listingId: input.listingId,
      listingSlug: input.listingSlug,
      listingTitle: input.booking.productTitle,
      vertical: input.vertical,
      merchantId: input.booking.merchant.id,
      merchantName: input.booking.merchant.name,
      bookingId: input.booking.id,
      bookingRef: input.booking.reference,
      customerEmail: input.booking.customer.email,
      authorName: input.authorName,
      authorAvatar: input.authorAvatar,
      rating,
      aspects: input.aspects,
      title: input.title,
      body: input.body,
      photos: input.photos ?? [],
      verifiedStay: true,
      stayedAt: input.booking.endAt,
      createdAt: at,
      // New reviews queue for moderation, which is what makes the admin
      // moderation screen do real work in a demo.
      status: "pending",
      helpful: 0,
      reports: [],
    };
    mutate((draft) => draft.reviews.unshift(review));
    return structuredClone(review);
  },

  moderate(
    id: string,
    decision: "published" | "rejected" | "removed",
    actor: DomainActor,
    note?: string,
    at = new Date().toISOString(),
  ): PlatformReview | undefined {
    let result: PlatformReview | undefined;
    mutate((draft) => {
      const review = draft.reviews.find((r) => r.id === id);
      if (!review) return;
      review.status = decision;
      review.moderation = { by: actor.name, at, note };
      result = structuredClone(review);
    });
    return result;
  },

  reply(id: string, authorName: string, body: string, at = new Date().toISOString()) {
    let result: PlatformReview | undefined;
    mutate((draft) => {
      const review = draft.reviews.find((r) => r.id === id);
      if (!review) return;
      review.response = { authorName, body, at };
      result = structuredClone(review);
    });
    return result;
  },

  report(id: string, by: string, reason: string, at = new Date().toISOString()) {
    mutate((draft) => {
      const review = draft.reviews.find((r) => r.id === id);
      if (review) review.reports.push({ by, reason, at });
    });
  },

  markHelpful(id: string) {
    mutate((draft) => {
      const review = draft.reviews.find((r) => r.id === id);
      if (review) review.helpful += 1;
    });
  },

  counts(scope: { merchantId?: string } = {}) {
    const rows = reviewService.all(scope);
    return {
      total: rows.length,
      pending: rows.filter((r) => r.status === "pending").length,
      published: rows.filter((r) => r.status === "published").length,
      reported: rows.filter((r) => r.reports.length > 0).length,
      awaitingReply: rows.filter((r) => r.status === "published" && !r.response).length,
    };
  },
};
