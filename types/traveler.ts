/**
 * Traveler account domain — the data a signed-in visitor sees under `/account`.
 *
 * All monetary amounts are stored in **base USD** (like listing prices) so the
 * locale currency switcher can reprice them live via {@link "@/features/i18n".useLocale}.
 * These shapes are what a real `/me/*` API would return; the mock service and
 * generators fill them today, and only {@link "@/services/account"} changes when
 * a backend arrives.
 */

import type { BookingVertical } from "./booking";
import type { LoyaltyTier } from "./account";

/** Lifecycle of a traveler's booking. Stored (never derived from wall-clock). */
export type BookingStatus = "upcoming" | "completed" | "cancelled" | "pending";

/** A trip the traveler has booked, pointing at a real catalog listing. */
export interface TravelerBooking {
  id: string;
  /** Human reference shown to the traveler, e.g. "SO-2K4F9A". */
  reference: string;
  listingId: string;
  listingSlug: string;
  vertical: BookingVertical;
  title: string;
  image: string;
  location: string;
  /** Trip start (ISO). For visas this is the appointment date. */
  checkIn: string;
  /** Trip end (ISO). */
  checkOut: string;
  nights: number;
  guests: number;
  rooms: number;
  status: BookingStatus;
  /** Total charged, base USD. */
  totalUsd: number;
  paymentMethod: string;
  invoiceId: string;
  bookedAt: string;
  reviewed: boolean;
  guestNames: string[];
  specialRequests?: string;
  cancellationPolicy: string;
}

/**
 * A booking created through the checkout flow, bundled with the invoice and
 * payment it generates. Persisted client-side (see
 * {@link "@/features/account/created-bookings"}) and merged on top of the
 * server dataset so a fresh booking shows across `/account/*` immediately. A
 * real backend returns this from `POST /bookings` and drops the client store.
 */
export interface CreatedBooking {
  booking: TravelerBooking;
  invoice: Invoice;
  payment: PaymentTxn;
}

export type InvoiceStatus = "paid" | "due" | "refunded" | "void";

/** A billing document for a booking. */
export interface Invoice {
  id: string;
  number: string;
  bookingId: string;
  bookingRef: string;
  title: string;
  issuedAt: string;
  dueAt: string;
  status: InvoiceStatus;
  subtotalUsd: number;
  taxesUsd: number;
  feesUsd: number;
  discountUsd: number;
  totalUsd: number;
  billTo: { name: string; email: string; country?: string };
}

export type PaymentStatus = "succeeded" | "refunded" | "pending" | "failed";
export type CardBrand = "visa" | "mastercard" | "amex" | "paypal";

/** A single ledger entry in the traveler's payment history. */
export interface PaymentTxn {
  id: string;
  bookingId?: string;
  bookingRef?: string;
  description: string;
  method: string;
  brand: CardBrand;
  /** Always positive; `type` gives the direction. */
  amountUsd: number;
  type: "charge" | "refund";
  status: PaymentStatus;
  date: string;
}

/** A stored payment instrument. Persisted client-side so edits survive reload. */
export interface SavedCard {
  id: string;
  brand: CardBrand;
  last4: string;
  expMonth: number;
  expYear: number;
  holder: string;
  isDefault: boolean;
  billingCountry?: string;
}

/** A saved co-traveler / passenger the user can attach to future bookings. */
export interface SavedTraveler {
  id: string;
  fullName: string;
  relationship: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  /** ISO 3166-1 alpha-2. */
  nationality?: string;
  passportNumber?: string;
  passportExpiry?: string;
  isPrimary: boolean;
}

/** A review the traveler has written. */
export interface TravelerReview {
  id: string;
  listingId: string;
  listingSlug: string;
  vertical: BookingVertical;
  listingTitle: string;
  listingImage: string;
  bookingRef: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
  updatedAt?: string;
  helpfulCount: number;
  response?: { author: string; body: string; date: string };
}

/** A completed, not-yet-reviewed booking surfaced as a review prompt. */
export interface ReviewableStay {
  bookingId: string;
  bookingRef: string;
  listingId: string;
  listingSlug: string;
  vertical: BookingVertical;
  title: string;
  image: string;
  stayedAt: string;
}

/** One message inside a {@link MessageThread}. */
export interface ThreadMessage {
  id: string;
  from: "me" | "them";
  authorName: string;
  body: string;
  sentAt: string;
}

/** A conversation with a host or with support. */
export interface MessageThread {
  id: string;
  subject: string;
  counterpart: { name: string; avatar?: string; role: string };
  bookingRef?: string;
  listingTitle?: string;
  lastMessageAt: string;
  unread: number;
  messages: ThreadMessage[];
}

export type NotificationType =
  | "booking"
  | "payment"
  | "message"
  | "promo"
  | "review"
  | "system";

/** An in-app notification. Read-state is persisted client-side. */
export interface AccountNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  date: string;
  read: boolean;
  href?: string;
}

export type CouponStatus = "active" | "used" | "expired";

/** A promo code held in the traveler's wallet. */
export interface Coupon {
  id: string;
  code: string;
  title: string;
  description: string;
  kind: "percent" | "fixed";
  /** Percent (0–100) or fixed USD, per `kind`. */
  value: number;
  minSpendUsd?: number;
  expiresAt: string;
  status: CouponStatus;
  scope: string;
}

export type RewardDirection = "earned" | "redeemed" | "expired" | "bonus";

/** A single movement in the loyalty points ledger. */
export interface RewardEntry {
  id: string;
  date: string;
  description: string;
  direction: RewardDirection;
  /** Always positive; `direction` gives the sign. */
  points: number;
  bookingRef?: string;
}

/** Loyalty snapshot + ledger for the rewards page. */
export interface RewardsSummary {
  balance: number;
  tier: LoyaltyTier;
  nextTier?: LoyaltyTier;
  /** Points still needed to reach `nextTier` (0 at top tier). */
  pointsToNextTier: number;
  /** Progress toward `nextTier` as a 0–1 ratio (1 at top tier). */
  progress: number;
  lifetimeEarned: number;
  entries: RewardEntry[];
}

/** Aggregate travel stats shown on the overview + history pages. */
export interface TravelStats {
  trips: number;
  countries: number;
  nights: number;
  cities: string[];
  totalSpentUsd: number;
}

/** Everything the overview dashboard needs in one payload. */
export interface AccountOverview {
  stats: TravelStats;
  upcoming: TravelerBooking[];
  recentBookings: TravelerBooking[];
  wishlistCount: number;
  unreadMessages: number;
  unreadNotifications: number;
  pendingReviews: number;
  rewards: { balance: number; tier: LoyaltyTier };
  activeCoupons: number;
}
