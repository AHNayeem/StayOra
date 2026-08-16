/**
 * Premium membership — a paid subscription the platform sells directly.
 *
 * This is deliberately *not* the loyalty tier system in `engagement.ts`. Loyalty
 * tiers are earned by spending and cost nothing; membership is bought, has a
 * price, a billing period and an expiry, and is a platform revenue source in its
 * own right. The two compose: a member earns loyalty points faster.
 *
 * Renewal is simulated — there is no recurring billing here, and there never
 * will be in a prototype. `renew()` exists so a demo can advance a subscription
 * a period and see the revenue land.
 *
 * Benefits are data, resolved once by {@link benefitsFor} and consumed by
 * checkout (fee waiver, member discount, insurance discount) and by loyalty
 * (points multiplier). No component decides what a member gets.
 */

import { money } from "./money";
import { getState, mutate, nextId, nextReference } from "./store";
import type { MembershipDunning } from "./membership-billing";

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

/** Plan codes. `free` is the implicit plan every signed-in traveller has. */
export type MembershipCode = "free" | "plus" | "premium";

export type BillingPeriod = "monthly" | "annual";

/** What a plan actually grants. Every field is consumed somewhere real. */
export interface MembershipBenefits {
  /** Share of the platform service fee waived, 0–1. */
  serviceFeeWaiver: number;
  /** Member-only discount off the sale, percent. */
  memberDiscountPercent: number;
  /** Cap on the member discount in USD. 0 = uncapped. */
  memberDiscountCap: number;
  /** Multiplier on loyalty points earned. */
  pointsMultiplier: number;
  /** Discount off insurance premiums, percent. */
  insuranceDiscountPercent: number;
  /** Free cancellation regardless of the rate's policy. */
  freeCancellation: boolean;
  /** Access to member-only offers (`eligibility: "member"`). */
  memberOnlyOffers: boolean;
  prioritySupport: boolean;
  /** Free-text perks shown on the plan card. */
  perks: string[];
}

export interface MembershipPlan {
  id: string;
  code: MembershipCode;
  name: string;
  tagline: string;
  /** USD for the period. Zero for `free`. */
  price: number;
  billingPeriod: BillingPeriod;
  /** Marketing comparison price, e.g. the monthly equivalent. */
  compareAtPrice?: number;
  benefits: MembershipBenefits;
  status: "active" | "draft" | "retired";
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type MembershipStatus = "active" | "cancelled" | "expired";

export interface MembershipSubscription {
  id: string;
  reference: string;
  customerEmail: string;
  customerName: string;
  planId: string;
  planCode: MembershipCode;
  planName: string;
  status: MembershipStatus;
  billingPeriod: BillingPeriod;
  currency: string;
  /** Price paid for the current period. */
  price: number;
  startAt: string;
  /** Simulated renewal date; also the expiry when `autoRenew` is off. */
  renewsAt: string;
  cancelledAt?: string;
  autoRenew: boolean;
  /** How many periods have been paid for. */
  periodsBilled: number;
  /** Lifetime revenue from this subscription, net of refunds. */
  lifetimeRevenue: number;
  refunded: number;
  /**
   * Set while a renewal charge is failing (`membership-billing.ts`). Cleared the
   * moment one succeeds, so its presence means "currently failing to bill".
   */
  dunning?: MembershipDunning;
}

export const PERIOD_LABELS: Record<BillingPeriod, string> = {
  monthly: "per month",
  annual: "per year",
};

export const MEMBERSHIP_STATUS_LABELS: Record<MembershipStatus, string> = {
  active: "Active",
  cancelled: "Cancelled",
  expired: "Expired",
};

/** What a traveller with no paid membership gets. */
export const FREE_BENEFITS: MembershipBenefits = {
  serviceFeeWaiver: 0,
  memberDiscountPercent: 0,
  memberDiscountCap: 0,
  pointsMultiplier: 1,
  insuranceDiscountPercent: 0,
  freeCancellation: false,
  memberOnlyOffers: false,
  prioritySupport: false,
  perks: [],
};

function periodMs(period: BillingPeriod): number {
  return period === "annual" ? 365 * 86_400_000 : 30 * 86_400_000;
}

/** Resolve a subscription's real status from its dates. */
export function statusAt(
  sub: MembershipSubscription,
  nowMs = Date.now(),
): MembershipStatus {
  if (sub.status === "cancelled") return "cancelled";
  return new Date(sub.renewsAt).getTime() < nowMs ? "expired" : "active";
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export interface SubscribeInput {
  customerEmail: string;
  customerName: string;
  planId: string;
  autoRenew?: boolean;
  at?: string;
}

export const membershipService = {
  plans(): MembershipPlan[] {
    return getState()
      .membershipPlans.filter((p) => p.status !== "retired")
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },

  allPlans(): MembershipPlan[] {
    return getState().membershipPlans;
  },

  plan(id: string): MembershipPlan | undefined {
    return getState().membershipPlans.find((p) => p.id === id);
  },

  planByCode(code: MembershipCode): MembershipPlan | undefined {
    return getState().membershipPlans.find((p) => p.code === code);
  },

  subscriptions(): MembershipSubscription[] {
    const nowMs = Date.now();
    return getState()
      .memberships.map((s) => ({ ...s, status: statusAt(s, nowMs) }))
      .sort((a, b) => b.startAt.localeCompare(a.startAt));
  },

  /** The traveller's current subscription, if any is still live. */
  current(email: string, nowMs = Date.now()): MembershipSubscription | undefined {
    const key = email.toLowerCase();
    return getState()
      .memberships.filter((s) => s.customerEmail.toLowerCase() === key)
      .map((s) => ({ ...s, status: statusAt(s, nowMs) }))
      .find((s) => s.status === "active");
  },

  /** Every subscription the traveller has ever held, newest first. */
  historyFor(email: string): MembershipSubscription[] {
    const key = email.toLowerCase();
    const nowMs = Date.now();
    return getState()
      .memberships.filter((s) => s.customerEmail.toLowerCase() === key)
      .map((s) => ({ ...s, status: statusAt(s, nowMs) }))
      .sort((a, b) => b.startAt.localeCompare(a.startAt));
  },

  /**
   * Buy a membership. Any live subscription is superseded, so a traveller can
   * only ever hold one — an upgrade replaces rather than stacks.
   */
  subscribe(input: SubscribeInput): MembershipSubscription {
    const plan = membershipService.plan(input.planId);
    if (!plan) throw new Error("Unknown membership plan");
    const at = input.at ?? new Date().toISOString();
    const startMs = new Date(at).getTime();

    const sub: MembershipSubscription = {
      id: nextId("mbs"),
      reference: nextReference("MEM", 61_000),
      customerEmail: input.customerEmail,
      customerName: input.customerName,
      planId: plan.id,
      planCode: plan.code,
      planName: plan.name,
      status: "active",
      billingPeriod: plan.billingPeriod,
      currency: "USD",
      price: plan.price,
      startAt: at,
      renewsAt: new Date(startMs + periodMs(plan.billingPeriod)).toISOString(),
      autoRenew: input.autoRenew ?? true,
      periodsBilled: 1,
      lifetimeRevenue: plan.price,
      refunded: 0,
    };

    mutate((draft) => {
      const key = input.customerEmail.toLowerCase();
      for (const row of draft.memberships) {
        if (row.customerEmail.toLowerCase() === key && row.status === "active") {
          row.status = "cancelled";
          row.cancelledAt = at;
          row.autoRenew = false;
        }
      }
      draft.memberships.unshift(sub);
    });
    return sub;
  },

  /** Stop auto-renewal. Benefits run to the end of the paid period. */
  cancel(id: string, at = new Date().toISOString()): MembershipSubscription | undefined {
    return mutate((draft) => {
      const row = draft.memberships.find((s) => s.id === id);
      if (!row) return undefined;
      row.autoRenew = false;
      row.cancelledAt = at;
      // The paid period is honoured; the row expires on `renewsAt` by itself.
      if (new Date(row.renewsAt).getTime() <= new Date(at).getTime()) {
        row.status = "cancelled";
      }
      return structuredClone(row);
    });
  },

  /** Simulate the next billing cycle. No real recurring billing exists. */
  renew(id: string, at = new Date().toISOString()): MembershipSubscription | undefined {
    return mutate((draft) => {
      const row = draft.memberships.find((s) => s.id === id);
      if (!row) return undefined;
      const from = Math.max(new Date(row.renewsAt).getTime(), new Date(at).getTime());
      row.renewsAt = new Date(from + periodMs(row.billingPeriod)).toISOString();
      row.status = "active";
      row.periodsBilled += 1;
      row.lifetimeRevenue = money(row.lifetimeRevenue + row.price);
      row.cancelledAt = undefined;
      return structuredClone(row);
    });
  },

  /** Refund the current period and end the membership immediately. */
  refund(
    id: string,
    amount?: number,
    at = new Date().toISOString(),
  ): { subscription: MembershipSubscription; refunded: number } | undefined {
    return mutate((draft) => {
      const row = draft.memberships.find((s) => s.id === id);
      if (!row) return undefined;
      const refunded = money(Math.min(amount ?? row.price, row.lifetimeRevenue - row.refunded));
      row.refunded = money(row.refunded + refunded);
      row.lifetimeRevenue = money(row.lifetimeRevenue - refunded);
      row.status = "cancelled";
      row.autoRenew = false;
      row.cancelledAt = at;
      return { subscription: structuredClone(row), refunded };
    });
  },

  /** Roll-up for the admin membership module. */
  summary(nowMs = Date.now()) {
    const rows = getState().memberships.map((s) => ({ ...s, status: statusAt(s, nowMs) }));
    const active = rows.filter((s) => s.status === "active");
    const byPlan = new Map<string, { name: string; members: number; revenue: number }>();
    for (const row of rows) {
      const entry = byPlan.get(row.planCode) ?? {
        name: row.planName,
        members: 0,
        revenue: 0,
      };
      entry.members += row.status === "active" ? 1 : 0;
      entry.revenue = money(entry.revenue + row.lifetimeRevenue);
      byPlan.set(row.planCode, entry);
    }
    return {
      currency: "USD",
      total: rows.length,
      active: active.length,
      cancelled: rows.filter((s) => s.status === "cancelled").length,
      expired: rows.filter((s) => s.status === "expired").length,
      autoRenewing: active.filter((s) => s.autoRenew).length,
      revenue: money(rows.reduce((n, s) => n + s.lifetimeRevenue, 0)),
      refunded: money(rows.reduce((n, s) => n + s.refunded, 0)),
      mrr: money(
        active.reduce(
          (n, s) => n + (s.billingPeriod === "annual" ? s.price / 12 : s.price),
          0,
        ),
      ),
      byPlan: [...byPlan.entries()].map(([code, v]) => ({ code, ...v })),
    };
  },
};

/**
 * What the traveller is entitled to right now. Checkout, loyalty and the offer
 * engine all read this rather than looking at plans themselves.
 */
export function benefitsFor(
  email: string | undefined,
  nowMs = Date.now(),
): MembershipBenefits & { code: MembershipCode; planName: string } {
  const sub = email ? membershipService.current(email, nowMs) : undefined;
  const plan = sub ? membershipService.plan(sub.planId) : undefined;
  if (!sub || !plan) {
    return { ...FREE_BENEFITS, code: "free", planName: "Otithee Free" };
  }
  return { ...plan.benefits, code: plan.code, planName: plan.name };
}

/** Is this traveller a paying member? Used by `eligibility: "member"` offers. */
export function isMember(email: string | undefined, nowMs = Date.now()): boolean {
  return benefitsFor(email, nowMs).code !== "free";
}

export type MembershipPlanInput = Omit<MembershipPlan, "id" | "createdAt" | "updatedAt">;

/** Plan CRUD — the admin membership module writes through here. */
export const membershipPlanStore = {
  create(input: MembershipPlanInput): MembershipPlan {
    const now = new Date().toISOString();
    const plan: MembershipPlan = {
      ...input,
      id: nextId("mpl"),
      createdAt: now,
      updatedAt: now,
    };
    mutate((draft) => draft.membershipPlans.push(plan));
    return plan;
  },

  update(
    id: string,
    patch: Partial<MembershipPlanInput>,
  ): { before: MembershipPlan; after: MembershipPlan } | undefined {
    return mutate((draft) => {
      const row = draft.membershipPlans.find((p) => p.id === id);
      if (!row) return undefined;
      const before = structuredClone(row);
      Object.assign(row, patch);
      row.updatedAt = new Date().toISOString();
      return { before, after: structuredClone(row) };
    });
  },
};
