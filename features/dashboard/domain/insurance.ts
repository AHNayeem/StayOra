/**
 * Travel insurance — a demo attach product and the revenue it earns.
 *
 * **These are not real insurance policies.** No underwriter is involved, no
 * cover exists and no claim can ever be made; the plans below are prototype
 * products that exist so the marketplace economics can be demonstrated.
 *
 * The money model is deliberately the same shape as merchant commission: the
 * customer pays a premium, a provider takes the larger share, and the platform
 * keeps a commission on top. The premium is **not** part of the commissionable
 * base of the booking — insurance revenue is its own line, so it can never be
 * double-counted as booking commission.
 *
 *   premium  →  provider share  →  platform commission  →  platform revenue
 *
 * Providers, plans and their commission terms are all editable data (the admin
 * insurance module writes them through here), and a plan-specific commission
 * rule in {@link import("./commission-rules")} overrides the plan's own terms.
 */

import { resolveCommission } from "./commission-rules";
import { money } from "./money";
import { getState, mutate, nextId, nextReference } from "./store";
import type { ProductKind } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InsuranceTier = "basic" | "standard" | "premium";

export const INSURANCE_TIERS: readonly InsuranceTier[] = ["basic", "standard", "premium"];

/** A demo underwriter. Nothing here reaches a real insurer. */
export interface InsuranceProvider {
  id: string;
  name: string;
  /** Short label shown next to a plan, e.g. "Demo underwriter". */
  disclaimer: string;
  country: string;
  contactEmail: string;
  /** Default platform commission on this provider's plans, percent. */
  defaultCommissionPercent: number;
  status: "active" | "paused";
  createdAt: string;
}

/** One coverage line on a plan. Amounts are illustrative USD limits. */
export interface CoverageItem {
  key:
    | "trip_cancellation"
    | "medical"
    | "baggage"
    | "delay"
    | "emergency_assistance";
  label: string;
  /** Cover limit in USD, or 0 when the plan excludes it. */
  limit: number;
  note?: string;
}

export type InsurancePricingModel = "per_traveler" | "per_booking" | "percent_of_trip";

export interface InsurancePlan {
  id: string;
  providerId: string;
  providerName: string;
  name: string;
  tier: InsuranceTier;
  summary: string;
  pricingModel: InsurancePricingModel;
  /** USD for the flat models, percent (0–100) for `percent_of_trip`. */
  price: number;
  /** Floor/cap for `percent_of_trip`. 0 = unbounded. */
  minPremium: number;
  maxPremium: number;
  coverage: CoverageItem[];
  /** Verticals the plan may be offered on; empty = all. */
  products: ProductKind[];
  /** Platform commission on the premium. */
  commissionType: "percent" | "fixed";
  commissionValue: number;
  status: "active" | "draft" | "retired";
  createdAt: string;
  updatedAt: string;
}

export type InsurancePolicyStatus = "active" | "cancelled" | "refunded" | "expired";

/** A plan actually sold against a booking. */
export interface InsurancePolicy {
  id: string;
  /** Human reference, e.g. "POL-51004". */
  reference: string;
  planId: string;
  planName: string;
  tier: InsuranceTier;
  providerId: string;
  providerName: string;
  bookingId: string;
  bookingRef: string;
  customerEmail: string;
  customerName: string;
  currency: string;
  /** What the customer paid. */
  premium: number;
  /** What the demo provider is owed. */
  providerShare: number;
  /** What the platform keeps. */
  platformRevenue: number;
  travelers: number;
  startAt: string;
  endAt: string;
  status: InsurancePolicyStatus;
  purchasedAt: string;
  cancelledAt?: string;
  /** Premium returned when the booking was refunded. */
  refunded: number;
  /** Platform revenue given back with it. */
  revenueReversed: number;
}

export const COVERAGE_LABELS: Record<CoverageItem["key"], string> = {
  trip_cancellation: "Trip cancellation",
  medical: "Medical expenses",
  baggage: "Baggage & belongings",
  delay: "Travel delay",
  emergency_assistance: "24/7 emergency assistance",
};

export const TIER_LABELS: Record<InsuranceTier, string> = {
  basic: "Basic",
  standard: "Standard",
  premium: "Premium",
};

/** Shown wherever a plan is offered. Non-negotiable. */
export const INSURANCE_DISCLAIMER =
  "Demo product — this prototype issues no real insurance policy and provides no cover.";

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

export interface InsuranceQuoteContext {
  travelers: number;
  /** Commissionable value of the trip, used by `percent_of_trip` plans. */
  tripValue: number;
  /** Discount on the premium, 0–100 — today only a membership benefit. */
  discountPercent?: number;
  at?: string;
}

export interface InsuranceQuote {
  plan: InsurancePlan;
  /** Premium before any member discount. */
  listPremium: number;
  discount: number;
  /** What the customer actually pays. */
  premium: number;
  providerShare: number;
  platformRevenue: number;
  /** How the platform's cut was decided (rule or plan terms). */
  commissionExplanation: string;
  commissionRuleId?: string;
}

/**
 * Price one plan for one trip. Pure — it reads the commission-rule table but
 * writes nothing, so a checkout can call it on every keystroke.
 */
export function quoteInsurance(
  plan: InsurancePlan,
  ctx: InsuranceQuoteContext,
): InsuranceQuote {
  const travelers = Math.max(1, ctx.travelers);
  let listPremium: number;
  switch (plan.pricingModel) {
    case "per_traveler":
      listPremium = money(plan.price * travelers);
      break;
    case "percent_of_trip":
      listPremium = money(Math.max(0, ctx.tripValue) * (plan.price / 100));
      break;
    default:
      listPremium = money(plan.price);
  }
  if (plan.minPremium > 0) listPremium = Math.max(listPremium, plan.minPremium);
  if (plan.maxPremium > 0) listPremium = Math.min(listPremium, plan.maxPremium);

  const discount = money(listPremium * ((ctx.discountPercent ?? 0) / 100));
  const premium = money(Math.max(0, listPremium - discount));

  // A plan-scoped commission rule wins; otherwise the plan's own terms apply.
  const resolution = resolveCommission({
    insurancePlanId: plan.id,
    gross: premium,
    net: premium,
    at: ctx.at,
  });
  const platformRevenue =
    resolution.scope === "insurance_plan"
      ? money(Math.min(premium, resolution.commission))
      : money(
          Math.min(
            premium,
            plan.commissionType === "percent"
              ? premium * (plan.commissionValue / 100)
              : plan.commissionValue,
          ),
        );

  return {
    plan,
    listPremium,
    discount,
    premium,
    providerShare: money(premium - platformRevenue),
    platformRevenue,
    commissionExplanation:
      resolution.scope === "insurance_plan"
        ? resolution.explanation
        : `Plan terms — ${
            plan.commissionType === "percent"
              ? `${plan.commissionValue}% of the premium`
              : `$${plan.commissionValue.toFixed(2)} per policy`
          }.`,
    commissionRuleId:
      resolution.scope === "insurance_plan" ? resolution.ruleId : undefined,
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export interface IssuePolicyInput {
  quote: InsuranceQuote;
  bookingId: string;
  bookingRef: string;
  customerEmail: string;
  customerName: string;
  currency: string;
  travelers: number;
  startAt: string;
  endAt: string;
  at?: string;
}

export const insuranceService = {
  providers(): InsuranceProvider[] {
    return getState().insuranceProviders;
  },

  provider(id: string): InsuranceProvider | undefined {
    return getState().insuranceProviders.find((p) => p.id === id);
  },

  /** Plans offerable for a vertical, cheapest tier first. */
  plansFor(productKind?: ProductKind): InsurancePlan[] {
    const order: Record<InsuranceTier, number> = { basic: 0, standard: 1, premium: 2 };
    return getState()
      .insurancePlans.filter(
        (p) =>
          p.status === "active" &&
          (!productKind || p.products.length === 0 || p.products.includes(productKind)),
      )
      .sort((a, b) => order[a.tier] - order[b.tier]);
  },

  allPlans(): InsurancePlan[] {
    return getState().insurancePlans;
  },

  plan(id: string): InsurancePlan | undefined {
    return getState().insurancePlans.find((p) => p.id === id);
  },

  /** Quote every offerable plan for a trip — what the checkout renders. */
  offers(productKind: ProductKind, ctx: InsuranceQuoteContext): InsuranceQuote[] {
    return insuranceService
      .plansFor(productKind)
      .map((plan) => quoteInsurance(plan, ctx));
  },

  policies(): InsurancePolicy[] {
    return getState().insurancePolicies;
  },

  policyFor(bookingId: string): InsurancePolicy | undefined {
    return getState().insurancePolicies.find(
      (p) => p.bookingId === bookingId && p.status !== "cancelled",
    );
  },

  policiesForCustomer(email: string): InsurancePolicy[] {
    const key = email.toLowerCase();
    return getState()
      .insurancePolicies.filter((p) => p.customerEmail.toLowerCase() === key)
      .sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt));
  },

  /** Persist a sold policy. The revenue entry is written by the caller. */
  issue(input: IssuePolicyInput): InsurancePolicy {
    const { quote } = input;
    const policy: InsurancePolicy = {
      id: nextId("pol"),
      reference: nextReference("POL", 51_000),
      planId: quote.plan.id,
      planName: quote.plan.name,
      tier: quote.plan.tier,
      providerId: quote.plan.providerId,
      providerName: quote.plan.providerName,
      bookingId: input.bookingId,
      bookingRef: input.bookingRef,
      customerEmail: input.customerEmail,
      customerName: input.customerName,
      currency: input.currency,
      premium: quote.premium,
      providerShare: quote.providerShare,
      platformRevenue: quote.platformRevenue,
      travelers: Math.max(1, input.travelers),
      startAt: input.startAt,
      endAt: input.endAt,
      status: "active",
      purchasedAt: input.at ?? new Date().toISOString(),
      refunded: 0,
      revenueReversed: 0,
    };
    mutate((draft) => draft.insurancePolicies.unshift(policy));
    return policy;
  },

  /**
   * Unwind a policy when its booking is refunded. Idempotent per booking, and
   * proportional — a 50% booking refund returns 50% of the premium.
   */
  reverseForBooking(
    bookingId: string,
    share: number,
    at = new Date().toISOString(),
  ): { policy: InsurancePolicy; refunded: number; revenueReversed: number } | null {
    const ratio = Math.max(0, Math.min(1, share));
    return mutate((draft) => {
      const policy = draft.insurancePolicies.find(
        (p) => p.bookingId === bookingId && p.status === "active",
      );
      if (!policy || ratio <= 0) return null;
      const refunded = money(policy.premium * ratio);
      const revenueReversed = money(policy.platformRevenue * ratio);
      policy.refunded = money(policy.refunded + refunded);
      policy.revenueReversed = money(policy.revenueReversed + revenueReversed);
      policy.status = ratio >= 1 ? "refunded" : "active";
      policy.cancelledAt = at;
      return { policy: structuredClone(policy), refunded, revenueReversed };
    });
  },

  /** Roll-up for the admin insurance module. */
  summary() {
    const policies = getState().insurancePolicies;
    const active = policies.filter((p) => p.status === "active");
    const sum = (rows: InsurancePolicy[], of: (p: InsurancePolicy) => number) =>
      money(rows.reduce((n, p) => n + of(p), 0));
    return {
      currency: "USD",
      policies: policies.length,
      activePolicies: active.length,
      grossPremium: sum(policies, (p) => p.premium),
      providerPayable: sum(policies, (p) => p.providerShare - p.refunded + p.revenueReversed),
      platformRevenue: sum(policies, (p) => p.platformRevenue - p.revenueReversed),
      refunded: sum(policies, (p) => p.refunded),
      attachRate: 0, // filled by the caller, which knows the booking count
      plans: getState().insurancePlans.length,
      providers: getState().insuranceProviders.length,
    };
  },
};

export type InsurancePlanInput = Omit<
  InsurancePlan,
  "id" | "createdAt" | "updatedAt" | "providerName"
>;

/** Plan CRUD — the admin insurance module writes through here. */
export const insurancePlanStore = {
  create(input: InsurancePlanInput): InsurancePlan {
    const now = new Date().toISOString();
    const provider = insuranceService.provider(input.providerId);
    const plan: InsurancePlan = {
      ...input,
      id: nextId("ins"),
      providerName: provider?.name ?? "Unknown provider",
      createdAt: now,
      updatedAt: now,
    };
    mutate((draft) => draft.insurancePlans.unshift(plan));
    return plan;
  },

  update(
    id: string,
    patch: Partial<InsurancePlanInput>,
  ): { before: InsurancePlan; after: InsurancePlan } | undefined {
    return mutate((draft) => {
      const row = draft.insurancePlans.find((p) => p.id === id);
      if (!row) return undefined;
      const before = structuredClone(row);
      Object.assign(row, patch);
      if (patch.providerId) {
        row.providerName =
          draft.insuranceProviders.find((p) => p.id === patch.providerId)?.name ??
          row.providerName;
      }
      row.updatedAt = new Date().toISOString();
      return { before, after: structuredClone(row) };
    });
  },

  remove(id: string): InsurancePlan | undefined {
    return mutate((draft) => {
      const index = draft.insurancePlans.findIndex((p) => p.id === id);
      if (index < 0) return undefined;
      return draft.insurancePlans.splice(index, 1)[0];
    });
  },
};
