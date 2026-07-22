/**
 * account.ts — service seam for the signed-in traveler's data (`/account/*`).
 *
 * Every getter is async (via {@link mockDelay}) and conceptually scoped to the
 * current session's user; the mock returns one demo traveler's history today.
 * Swapping to a real `/me/*` API means changing only these bodies. Mutations
 * (e.g. {@link cancelBooking}) mutate the in-memory dataset so a `router.refresh`
 * reflects them within the session — the same stub approach the dashboard uses.
 */

import type {
  AccountOverview,
  Coupon,
  Invoice,
  MessageThread,
  PaymentTxn,
  ReviewableStay,
  RewardsSummary,
  TravelStats,
  TravelerBooking,
  TravelerReview,
} from "@/types/traveler";
import type { LoyaltyTier } from "@/types/account";
import { ACCOUNT_DATA } from "@/lib/mock/account-data";
import { SEED_ACCOUNTS } from "@/constants/accounts";
import { mockDelay } from "./http";

const TRAVELER = SEED_ACCOUNTS[0];

/** Recency order helper — newest first by an ISO field. */
function byNewest<T>(field: (x: T) => string) {
  return (a: T, z: T) => (field(a) < field(z) ? 1 : -1);
}

// ------------------------------- Bookings ---------------------------------

/** All of the traveler's bookings, newest trip first. */
export function getBookings(): Promise<TravelerBooking[]> {
  const sorted = [...ACCOUNT_DATA.bookings].sort(byNewest((b) => b.checkIn));
  return mockDelay(sorted);
}

/** A single booking by id (or `undefined` → route renders notFound). */
export function getBooking(id: string): Promise<TravelerBooking | undefined> {
  return mockDelay(ACCOUNT_DATA.bookings.find((b) => b.id === id));
}

/**
 * Cancel a booking (mock): flips status to "cancelled" in-memory and voids its
 * invoice. Returns the updated booking, or `undefined` if it can't be cancelled.
 */
export function cancelBooking(id: string): Promise<TravelerBooking | undefined> {
  const booking = ACCOUNT_DATA.bookings.find((b) => b.id === id);
  if (!booking || booking.status === "cancelled" || booking.status === "completed") {
    return mockDelay(undefined);
  }
  booking.status = "cancelled";
  const invoice = ACCOUNT_DATA.invoices.find((inv) => inv.id === booking.invoiceId);
  if (invoice) invoice.status = invoice.status === "paid" ? "refunded" : "void";
  return mockDelay(booking);
}

// ------------------------------- Invoices ---------------------------------

export function getInvoices(): Promise<Invoice[]> {
  const sorted = [...ACCOUNT_DATA.invoices].sort(byNewest((i) => i.issuedAt));
  return mockDelay(sorted);
}

export function getInvoice(id: string): Promise<Invoice | undefined> {
  return mockDelay(ACCOUNT_DATA.invoices.find((i) => i.id === id));
}

// ------------------------------- Payments ---------------------------------

export function getPayments(): Promise<PaymentTxn[]> {
  return mockDelay(ACCOUNT_DATA.payments);
}

// ------------------------------- Messages ---------------------------------

export function getThreads(): Promise<MessageThread[]> {
  return mockDelay(ACCOUNT_DATA.threads);
}

export function getThread(id: string): Promise<MessageThread | undefined> {
  return mockDelay(ACCOUNT_DATA.threads.find((t) => t.id === id));
}

// -------------------------------- Reviews ---------------------------------

/** Completed bookings the traveler hasn't reviewed yet — review prompts. */
export function getReviewableStays(): Promise<ReviewableStay[]> {
  const stays = ACCOUNT_DATA.bookings
    .filter((b) => b.status === "completed" && !b.reviewed)
    .map<ReviewableStay>((b) => ({
      bookingId: b.id,
      bookingRef: b.reference,
      listingId: b.listingId,
      listingSlug: b.listingSlug,
      vertical: b.vertical,
      title: b.title,
      image: b.image,
      stayedAt: b.checkOut,
    }));
  return mockDelay(stays);
}

/** Seed reviews the traveler has authored (the client store layers edits on top). */
export function getAuthoredReviews(): Promise<TravelerReview[]> {
  return mockDelay(ACCOUNT_DATA.reviews);
}

// -------------------------------- Coupons ---------------------------------

export function getCoupons(): Promise<Coupon[]> {
  return mockDelay(ACCOUNT_DATA.coupons);
}

// -------------------------------- Rewards ---------------------------------

const TIER_ORDER: LoyaltyTier[] = ["bronze", "silver", "gold", "platinum"];
const TIER_THRESHOLDS: Record<LoyaltyTier, number> = {
  bronze: 0,
  silver: 2500,
  gold: 5000,
  platinum: 15000,
};

export function getRewardsSummary(): Promise<RewardsSummary> {
  const tier = TRAVELER.loyaltyTier;
  const lifetimeEarned = ACCOUNT_DATA.rewards
    .filter((e) => e.direction === "earned" || e.direction === "bonus")
    .reduce((sum, e) => sum + e.points, 0);
  const nextTier = TIER_ORDER[TIER_ORDER.indexOf(tier) + 1];
  const pointsToNextTier = nextTier
    ? Math.max(0, TIER_THRESHOLDS[nextTier] - lifetimeEarned)
    : 0;
  const floor = TIER_THRESHOLDS[tier];
  const ceil = nextTier ? TIER_THRESHOLDS[nextTier] : floor;
  const progress = nextTier
    ? Math.max(0, Math.min(1, (lifetimeEarned - floor) / (ceil - floor)))
    : 1;

  return mockDelay({
    balance: TRAVELER.points,
    tier,
    nextTier,
    pointsToNextTier,
    progress,
    lifetimeEarned,
    entries: ACCOUNT_DATA.rewards,
  });
}

// --------------------------- Travel stats / history -----------------------

export function getTravelStats(): Promise<TravelStats> {
  const completed = ACCOUNT_DATA.bookings.filter((b) => b.status === "completed");
  const cities = Array.from(new Set(completed.map((b) => b.location.split(",")[0].trim())));
  const countries = new Set(
    completed.map((b) => b.location.split(",").pop()?.trim()).filter(Boolean),
  );
  return mockDelay({
    trips: completed.length,
    countries: countries.size,
    nights: completed.reduce((sum, b) => sum + b.nights, 0),
    cities,
    totalSpentUsd: completed.reduce((sum, b) => sum + b.totalUsd, 0),
  });
}

/** Completed trips, newest first — the travel-history timeline. */
export function getTravelHistory(): Promise<TravelerBooking[]> {
  const history = ACCOUNT_DATA.bookings
    .filter((b) => b.status === "completed")
    .sort(byNewest((b) => b.checkOut));
  return mockDelay(history);
}

// -------------------------------- Overview --------------------------------

export function getOverview(): Promise<AccountOverview> {
  const bookings = ACCOUNT_DATA.bookings;
  const completed = bookings.filter((b) => b.status === "completed");
  const upcoming = bookings
    .filter((b) => b.status === "upcoming")
    .sort((a, z) => (a.checkIn < z.checkIn ? -1 : 1));
  const cities = Array.from(new Set(completed.map((b) => b.location.split(",")[0].trim())));
  const countries = new Set(
    completed.map((b) => b.location.split(",").pop()?.trim()).filter(Boolean),
  );

  return mockDelay({
    stats: {
      trips: completed.length,
      countries: countries.size,
      nights: completed.reduce((sum, b) => sum + b.nights, 0),
      cities,
      totalSpentUsd: completed.reduce((sum, b) => sum + b.totalUsd, 0),
    },
    upcoming: upcoming.slice(0, 3),
    recentBookings: [...bookings].sort(byNewest((b) => b.bookedAt)).slice(0, 4),
    wishlistCount: ACCOUNT_DATA.wishlistSeedIds.length,
    unreadMessages: ACCOUNT_DATA.threads.reduce((sum, t) => sum + t.unread, 0),
    unreadNotifications: ACCOUNT_DATA.notifications.filter((n) => !n.read).length,
    pendingReviews: completed.filter((b) => !b.reviewed).length,
    rewards: { balance: TRAVELER.points, tier: TRAVELER.loyaltyTier },
    activeCoupons: ACCOUNT_DATA.coupons.filter((c) => c.status === "active").length,
  });
}
