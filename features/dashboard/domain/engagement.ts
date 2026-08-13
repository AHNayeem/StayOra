/**
 * Loyalty, coupons and referrals — the customer-value layer.
 *
 * Points are a real ledger: every movement is an entry, the balance is the sum,
 * and earning is driven by booking lifecycle (points accrue when a booking
 * completes and are reversed if it is refunded). Redemption produces an
 * {@link AppliedDiscount} that flows through the same pricing path as any other
 * discount, so commission is calculated on the discounted net sale exactly as it
 * would be for a promo code.
 *
 * Coupons here are *wallet* coupons — issued to one customer by a campaign.
 * Platform-wide promo codes remain {@link import("./types").Offer}s owned by
 * marketing; checkout accepts either.
 */

import { money } from "./money";
import { getState, mutate, nextId } from "./store";
import type { AppliedDiscount, Booking, ProductKind } from "./types";

// ---------------------------------------------------------------------------
// Loyalty
// ---------------------------------------------------------------------------

export type LoyaltyTierId = "bronze" | "silver" | "gold" | "platinum";

export interface LoyaltyTierDef {
  id: LoyaltyTierId;
  name: string;
  /** Lifetime points needed to reach the tier. */
  threshold: number;
  /** Multiplier on points earned. */
  earnMultiplier: number;
  benefits: string[];
}

export const LOYALTY_TIERS: LoyaltyTierDef[] = [
  {
    id: "bronze",
    name: "Bronze",
    threshold: 0,
    earnMultiplier: 1,
    benefits: ["1 point per $1 spent", "Member-only rates"],
  },
  {
    id: "silver",
    name: "Silver",
    threshold: 2_500,
    earnMultiplier: 1.15,
    benefits: ["1.15× points", "Early check-in when available", "Priority support queue"],
  },
  {
    id: "gold",
    name: "Gold",
    threshold: 5_000,
    earnMultiplier: 1.3,
    benefits: ["1.3× points", "Room upgrade when available", "Free cancellation perks"],
  },
  {
    id: "platinum",
    name: "Platinum",
    threshold: 15_000,
    earnMultiplier: 1.5,
    benefits: ["1.5× points", "Guaranteed late check-out", "Dedicated concierge", "Lounge access"],
  },
];

/** Points earned per USD of net sale, before the tier multiplier. */
export const POINTS_PER_USD = 5;
/** What one point is worth when redeemed. 100 points = $1. */
export const POINT_VALUE_USD = 0.01;
/** Smallest redeemable block, so the UI never offers 37 points. */
export const REDEEM_STEP = 500;
/** Share of a booking total that may be paid with points. */
export const MAX_POINTS_SHARE = 0.4;

export type LoyaltyDirection = "earned" | "redeemed" | "expired" | "bonus" | "reversed";

export interface LoyaltyEntry {
  id: string;
  customerEmail: string;
  at: string;
  direction: LoyaltyDirection;
  /** Always positive; `direction` gives the sign. */
  points: number;
  description: string;
  bookingId?: string;
  bookingRef?: string;
  /** Earned points lapse 24 months after they land. */
  expiresAt?: string;
}

function signed(entry: LoyaltyEntry): number {
  return entry.direction === "earned" || entry.direction === "bonus"
    ? entry.points
    : -entry.points;
}

function ledgerFor(email: string): LoyaltyEntry[] {
  const key = email.toLowerCase();
  return getState().loyalty.filter((e) => e.customerEmail.toLowerCase() === key);
}

export interface LoyaltySummary {
  balance: number;
  lifetimeEarned: number;
  tier: LoyaltyTierDef;
  nextTier?: LoyaltyTierDef;
  pointsToNextTier: number;
  progress: number;
  /** Points that lapse in the next 90 days. */
  expiringSoon: number;
  entries: LoyaltyEntry[];
}

export function tierFor(lifetimeEarned: number): LoyaltyTierDef {
  return [...LOYALTY_TIERS].reverse().find((t) => lifetimeEarned >= t.threshold) ?? LOYALTY_TIERS[0];
}

export const loyaltyService = {
  summary(email: string, nowMs = Date.now()): LoyaltySummary {
    const entries = ledgerFor(email).sort((a, b) => b.at.localeCompare(a.at));
    const balance = entries.reduce((sum, e) => sum + signed(e), 0);
    const lifetimeEarned = entries
      .filter((e) => e.direction === "earned" || e.direction === "bonus")
      .reduce((sum, e) => sum + e.points, 0);
    const tier = tierFor(lifetimeEarned);
    const nextTier = LOYALTY_TIERS[LOYALTY_TIERS.indexOf(tier) + 1];
    const span = nextTier ? nextTier.threshold - tier.threshold : 1;
    const horizon = nowMs + 90 * 86_400_000;

    return {
      balance: Math.max(0, balance),
      lifetimeEarned,
      tier,
      nextTier,
      pointsToNextTier: nextTier ? Math.max(0, nextTier.threshold - lifetimeEarned) : 0,
      progress: nextTier
        ? Math.max(0, Math.min(1, (lifetimeEarned - tier.threshold) / span))
        : 1,
      expiringSoon: entries
        .filter(
          (e) =>
            e.direction === "earned" &&
            e.expiresAt &&
            new Date(e.expiresAt).getTime() <= horizon,
        )
        .reduce((sum, e) => sum + e.points, 0),
      entries,
    };
  },

  balance(email: string): number {
    return Math.max(0, ledgerFor(email).reduce((sum, e) => sum + signed(e), 0));
  },

  /** Points a booking would earn, at the customer's current tier. */
  previewEarn(email: string, netSale: number): number {
    const { tier } = loyaltyService.summary(email);
    return Math.round(netSale * POINTS_PER_USD * tier.earnMultiplier);
  },

  /** Credit points for a completed booking (idempotent per booking). */
  earnForBooking(booking: Booking, at = new Date().toISOString()): LoyaltyEntry | null {
    const email = booking.customer.email;
    const already = ledgerFor(email).some(
      (e) => e.bookingId === booking.id && e.direction === "earned",
    );
    if (already || booking.money.netSale <= 0) return null;

    const points = loyaltyService.previewEarn(email, booking.money.netSale);
    const entry: LoyaltyEntry = {
      id: nextId("lyl"),
      customerEmail: email,
      at,
      direction: "earned",
      points,
      description: `${booking.productTitle} — ${booking.nights || 1} night stay`,
      bookingId: booking.id,
      bookingRef: booking.reference,
      expiresAt: new Date(new Date(at).getTime() + 730 * 86_400_000).toISOString(),
    };
    mutate((draft) => draft.loyalty.unshift(entry));
    return entry;
  },

  /** Claw points back when a completed booking is refunded. */
  reverseForBooking(booking: Booking, at = new Date().toISOString()): void {
    const earned = ledgerFor(booking.customer.email).find(
      (e) => e.bookingId === booking.id && e.direction === "earned",
    );
    if (!earned) return;
    const already = ledgerFor(booking.customer.email).some(
      (e) => e.bookingId === booking.id && e.direction === "reversed",
    );
    if (already) return;
    mutate((draft) =>
      draft.loyalty.unshift({
        id: nextId("lyl"),
        customerEmail: booking.customer.email,
        at,
        direction: "reversed",
        points: earned.points,
        description: `Points reversed — ${booking.reference} refunded`,
        bookingId: booking.id,
        bookingRef: booking.reference,
      }),
    );
  },

  /** The most points that may be spent against a given order total. */
  maxRedeemable(email: string, orderTotal: number): number {
    const cap = Math.floor((orderTotal * MAX_POINTS_SHARE) / POINT_VALUE_USD);
    const affordable = Math.min(loyaltyService.balance(email), cap);
    return Math.max(0, Math.floor(affordable / REDEEM_STEP) * REDEEM_STEP);
  },

  /** Turn points into a discount line, without spending them yet. */
  quoteRedemption(email: string, points: number, orderTotal: number): AppliedDiscount | null {
    const allowed = Math.min(points, loyaltyService.maxRedeemable(email, orderTotal));
    if (allowed < REDEEM_STEP) return null;
    return {
      kind: "offer",
      ref: `points:${allowed}`,
      label: `${allowed.toLocaleString()} loyalty points`,
      amount: money(allowed * POINT_VALUE_USD),
    };
  },

  /** Spend points. Call once the booking is actually created. */
  redeem(
    email: string,
    points: number,
    context: { bookingId?: string; bookingRef?: string; description?: string },
    at = new Date().toISOString(),
  ): LoyaltyEntry | null {
    if (points <= 0) return null;
    const entry: LoyaltyEntry = {
      id: nextId("lyl"),
      customerEmail: email,
      at,
      direction: "redeemed",
      points,
      description: context.description ?? `Redeemed against ${context.bookingRef ?? "a booking"}`,
      bookingId: context.bookingId,
      bookingRef: context.bookingRef,
    };
    mutate((draft) => draft.loyalty.unshift(entry));
    return entry;
  },

  /** Manual credit — goodwill, campaign bonus, referral reward. */
  credit(
    email: string,
    points: number,
    description: string,
    at = new Date().toISOString(),
  ): LoyaltyEntry {
    const entry: LoyaltyEntry = {
      id: nextId("lyl"),
      customerEmail: email,
      at,
      direction: "bonus",
      points,
      description,
      expiresAt: new Date(new Date(at).getTime() + 730 * 86_400_000).toISOString(),
    };
    mutate((draft) => draft.loyalty.unshift(entry));
    return entry;
  },
};

// ---------------------------------------------------------------------------
// Wallet coupons
// ---------------------------------------------------------------------------

export type CouponCampaign =
  | "welcome"
  | "win_back"
  | "birthday"
  | "campaign"
  | "referral"
  | "goodwill";

export type WalletCouponStatus = "active" | "used" | "expired";

export interface WalletCoupon {
  id: string;
  code: string;
  customerEmail: string;
  campaign: CouponCampaign;
  title: string;
  description: string;
  discountType: "percent" | "fixed";
  value: number;
  minSpend: number;
  /** Cap on a percent discount; 0 = uncapped. */
  maxDiscount: number;
  /** Verticals it applies to; empty = all. */
  products: ProductKind[];
  issuedAt: string;
  expiresAt: string;
  usageLimit: number;
  used: number;
  status: WalletCouponStatus;
}

export interface CouponEvaluation {
  applicable: boolean;
  discount: number;
  reason?: string;
}

export const CAMPAIGN_LABELS: Record<CouponCampaign, string> = {
  welcome: "Welcome offer",
  win_back: "We miss you",
  birthday: "Birthday treat",
  campaign: "Campaign",
  referral: "Referral reward",
  goodwill: "Goodwill",
};

function couponsFor(email: string): WalletCoupon[] {
  const key = email.toLowerCase();
  return getState().walletCoupons.filter((c) => c.customerEmail.toLowerCase() === key);
}

export const couponService = {
  list(email: string, nowMs = Date.now()): WalletCoupon[] {
    return couponsFor(email)
      .map((coupon) => ({
        ...coupon,
        status: resolveCouponStatus(coupon, nowMs),
      }))
      .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  },

  find(email: string, code: string): WalletCoupon | undefined {
    const normalized = code.trim().toUpperCase();
    return couponsFor(email).find((c) => c.code.toUpperCase() === normalized);
  },

  evaluate(
    coupon: WalletCoupon,
    ctx: { amount: number; productKind: ProductKind; nowMs?: number },
  ): CouponEvaluation {
    const nowMs = ctx.nowMs ?? Date.now();
    const status = resolveCouponStatus(coupon, nowMs);
    if (status === "used") return { applicable: false, discount: 0, reason: "Already used." };
    if (status === "expired") return { applicable: false, discount: 0, reason: "This code has expired." };
    if (coupon.products.length && !coupon.products.includes(ctx.productKind)) {
      return {
        applicable: false,
        discount: 0,
        reason: `Only valid on ${coupon.products.join(", ")}.`,
      };
    }
    if (ctx.amount < coupon.minSpend) {
      return {
        applicable: false,
        discount: 0,
        reason: `Spend at least $${coupon.minSpend} to use this code.`,
      };
    }
    const raw =
      coupon.discountType === "percent" ? (ctx.amount * coupon.value) / 100 : coupon.value;
    const capped = coupon.maxDiscount > 0 ? Math.min(raw, coupon.maxDiscount) : raw;
    return { applicable: true, discount: money(Math.min(capped, ctx.amount)) };
  },

  toDiscount(coupon: WalletCoupon, discount: number): AppliedDiscount {
    return { kind: "coupon", ref: coupon.code, label: coupon.title, amount: money(discount) };
  },

  /** Mark a coupon consumed once the booking exists. */
  consume(id: string): void {
    mutate((draft) => {
      const coupon = draft.walletCoupons.find((c) => c.id === id);
      if (!coupon) return;
      coupon.used += 1;
      if (coupon.used >= coupon.usageLimit) coupon.status = "used";
    });
  },

  issue(input: Omit<WalletCoupon, "id" | "used" | "status">): WalletCoupon {
    const coupon: WalletCoupon = { ...input, id: nextId("wcp"), used: 0, status: "active" };
    mutate((draft) => draft.walletCoupons.unshift(coupon));
    return coupon;
  },
};

function resolveCouponStatus(coupon: WalletCoupon, nowMs: number): WalletCouponStatus {
  if (coupon.used >= coupon.usageLimit) return "used";
  if (new Date(coupon.expiresAt).getTime() < nowMs) return "expired";
  return "active";
}

// ---------------------------------------------------------------------------
// Referrals
// ---------------------------------------------------------------------------

export type ReferralStatus = "invited" | "signed_up" | "booked" | "rewarded";

export interface Referral {
  id: string;
  code: string;
  referrerEmail: string;
  inviteeEmail: string;
  inviteeName?: string;
  invitedAt: string;
  status: ReferralStatus;
  /** Points the referrer gets once the invitee books. */
  rewardPoints: number;
  rewardedAt?: string;
  bookingRef?: string;
}

/** Points both sides get when a referral converts. */
export const REFERRAL_REWARD_POINTS = 2_000;

/** A stable, shareable code derived from the account's email. */
export function referralCodeFor(email: string): string {
  const handle = email.split("@")[0].replace(/[^a-z0-9]/gi, "").toUpperCase();
  let sum = 0;
  for (let i = 0; i < email.length; i += 1) sum = (sum * 31 + email.charCodeAt(i)) % 9_000;
  return `${handle.slice(0, 6) || "TRAVEL"}${1_000 + sum}`;
}

export const referralService = {
  list(email: string): Referral[] {
    const key = email.toLowerCase();
    return getState()
      .referrals.filter((r) => r.referrerEmail.toLowerCase() === key)
      .sort((a, b) => b.invitedAt.localeCompare(a.invitedAt));
  },

  summary(email: string) {
    const rows = referralService.list(email);
    return {
      code: referralCodeFor(email),
      invited: rows.length,
      signedUp: rows.filter((r) => r.status !== "invited").length,
      booked: rows.filter((r) => r.status === "booked" || r.status === "rewarded").length,
      pointsEarned: rows
        .filter((r) => r.status === "rewarded")
        .reduce((sum, r) => sum + r.rewardPoints, 0),
      pointsPending: rows
        .filter((r) => r.status === "booked")
        .reduce((sum, r) => sum + r.rewardPoints, 0),
      rows,
    };
  },

  invite(referrerEmail: string, inviteeEmail: string, at = new Date().toISOString()): Referral {
    const referral: Referral = {
      id: nextId("ref"),
      code: referralCodeFor(referrerEmail),
      referrerEmail,
      inviteeEmail,
      invitedAt: at,
      status: "invited",
      rewardPoints: REFERRAL_REWARD_POINTS,
    };
    mutate((draft) => draft.referrals.unshift(referral));
    return referral;
  },

  /** Advance a referral and pay the reward when it lands on `rewarded`. */
  advance(id: string, status: ReferralStatus, bookingRef?: string): Referral | undefined {
    let result: Referral | undefined;
    const at = new Date().toISOString();
    mutate((draft) => {
      const referral = draft.referrals.find((r) => r.id === id);
      if (!referral) return;
      referral.status = status;
      if (bookingRef) referral.bookingRef = bookingRef;
      if (status === "rewarded") referral.rewardedAt = at;
      result = structuredClone(referral);
    });
    if (result && status === "rewarded") {
      loyaltyService.credit(
        result.referrerEmail,
        result.rewardPoints,
        `Referral reward — ${result.inviteeEmail}`,
        at,
      );
    }
    return result;
  },
};
