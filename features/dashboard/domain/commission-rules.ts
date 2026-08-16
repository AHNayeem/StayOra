/**
 * Commission configuration — one place that decides what the platform charges.
 *
 * Before this file the rate came from a constant map keyed by product kind,
 * with a per-merchant override. That is still the *fallback*, but it is no
 * longer the model: a rule can now target a vertical, a single merchant, one
 * product, a rate plan, a B2B account or an insurance plan, carry a percentage
 * and/or a flat fee, be floored and capped, be measured against gross or net,
 * and only apply between two dates.
 *
 * Resolution is deliberately boring and explainable — the admin UI renders the
 * winning rule and *why* it won:
 *
 *   1. keep every active rule whose target matches and whose window covers the
 *      booking date
 *   2. take the highest specificity (insurance/B2B → rate plan → product →
 *      merchant → vertical)
 *   3. break ties on the most recently effective rule
 *   4. fall back to the merchant's negotiated rate, then the product default
 *
 * Nothing computes a commission itself: callers resolve a rule here and hand
 * the result to {@link import("./money").priceBooking}.
 */

import { PRICING_CONFIG, money } from "./money";
import { getState, mutate, nextId } from "./store";
import type { CommissionBasis, ProductKind } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** What a rule is attached to. */
export const COMMISSION_SCOPES = [
  "vertical",
  "merchant",
  "product",
  "rate_plan",
  "b2b_account",
  "insurance_plan",
] as const;

export type CommissionScope = (typeof COMMISSION_SCOPES)[number];

/** How the charge is worked out. */
export type CommissionCalc = "percent" | "fixed" | "percent_plus_fixed";

export type CommissionRuleStatus = "active" | "scheduled" | "expired" | "disabled";

export interface CommissionRule {
  id: string;
  name: string;
  scope: CommissionScope;
  /**
   * The thing the rule targets: a {@link ProductKind} for `vertical`, a
   * merchant id, a listing id, a rate-plan id, a B2B account id or an
   * insurance-plan id.
   */
  targetId: string;
  targetLabel: string;
  calc: CommissionCalc;
  /** Percentage component, 0–100. Ignored when `calc` is `fixed`. */
  percent: number;
  /** Flat component in USD. Ignored when `calc` is `percent`. */
  fixedFee: number;
  /** Floor on the resulting commission. 0 = no floor. */
  minFee: number;
  /** Cap on the resulting commission. 0 = uncapped. */
  maxFee: number;
  /** What the percentage is measured against. */
  basis: CommissionBasis;
  effectiveFrom: string;
  /** Open-ended when absent. */
  effectiveTo?: string;
  status: CommissionRuleStatus;
  note?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

/** Higher wins. A rule about one product beats a rule about a whole vertical. */
export const SCOPE_SPECIFICITY: Record<CommissionScope, number> = {
  vertical: 10,
  merchant: 20,
  product: 30,
  rate_plan: 40,
  b2b_account: 50,
  insurance_plan: 60,
};

export const SCOPE_LABELS: Record<CommissionScope, string> = {
  vertical: "Vertical",
  merchant: "Merchant",
  product: "Product",
  rate_plan: "Rate plan",
  b2b_account: "B2B account",
  insurance_plan: "Insurance plan",
};

export const CALC_LABELS: Record<CommissionCalc, string> = {
  percent: "Percentage",
  fixed: "Fixed fee",
  percent_plus_fixed: "Percentage + fixed",
};

export const BASIS_LABELS: Record<CommissionBasis, string> = {
  net: "Discounted net sale",
  gross: "Gross sale (pre-discount)",
  fixed: "Flat per booking",
};

/** What a caller knows about the transaction being priced. */
export interface CommissionContext {
  productKind?: ProductKind;
  merchantId?: string;
  /** Catalog listing id, when the booking came from a listing. */
  productId?: string;
  ratePlanId?: string;
  b2bAccountId?: string;
  insurancePlanId?: string;
  /** `base + markup` — the sale before discounts. */
  gross: number;
  /** `base + markup − discount` — the sale after discounts. */
  net: number;
  /** The merchant's negotiated rate, used when no rule matches. */
  merchantRate?: number;
  /** Evaluation date (ISO). Defaults to now. */
  at?: string;
}

export interface CommissionResolution {
  ruleId?: string;
  ruleName: string;
  scope: CommissionScope | "default";
  basis: CommissionBasis;
  /** The amount the percentage was applied to. */
  basisAmount: number;
  /** Effective rate as a percentage of `basisAmount`, for display. */
  rate: number;
  percentComponent: number;
  fixedComponent: number;
  commission: number;
  minFeeApplied: boolean;
  maxFeeApplied: boolean;
  /** One sentence the admin UI shows verbatim. */
  explanation: string;
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

/** Is the rule live at `at`? Status is authoritative; dates refine it. */
export function ruleActiveAt(rule: CommissionRule, at: string): boolean {
  if (rule.status === "disabled") return false;
  const t = new Date(at).getTime();
  if (t < new Date(rule.effectiveFrom).getTime()) return false;
  if (rule.effectiveTo && t > new Date(rule.effectiveTo).getTime()) return false;
  return true;
}

/** Recompute a rule's status from its window — used after edits and on read. */
export function statusForWindow(
  rule: Pick<CommissionRule, "effectiveFrom" | "effectiveTo" | "status">,
  at: string = new Date().toISOString(),
): CommissionRuleStatus {
  if (rule.status === "disabled") return "disabled";
  const t = new Date(at).getTime();
  if (t < new Date(rule.effectiveFrom).getTime()) return "scheduled";
  if (rule.effectiveTo && t > new Date(rule.effectiveTo).getTime()) return "expired";
  return "active";
}

function targetMatches(rule: CommissionRule, ctx: CommissionContext): boolean {
  switch (rule.scope) {
    case "vertical":
      return rule.targetId === ctx.productKind;
    case "merchant":
      return rule.targetId === ctx.merchantId;
    case "product":
      return rule.targetId === ctx.productId;
    case "rate_plan":
      return rule.targetId === ctx.ratePlanId;
    case "b2b_account":
      return rule.targetId === ctx.b2bAccountId;
    case "insurance_plan":
      return rule.targetId === ctx.insurancePlanId;
    default:
      return false;
  }
}

/** Every rule that could apply, most specific first. */
export function matchingRules(ctx: CommissionContext): CommissionRule[] {
  const at = ctx.at ?? new Date().toISOString();
  return getState()
    .commissionRules.filter((r) => ruleActiveAt(r, at) && targetMatches(r, ctx))
    .sort(
      (a, b) =>
        SCOPE_SPECIFICITY[b.scope] - SCOPE_SPECIFICITY[a.scope] ||
        b.effectiveFrom.localeCompare(a.effectiveFrom),
    );
}

/** Apply a rule's arithmetic to an amount. Exported so previews can reuse it. */
export function applyRule(
  rule: CommissionRule,
  ctx: Pick<CommissionContext, "gross" | "net">,
): CommissionResolution {
  const basisAmount =
    rule.basis === "gross" ? money(ctx.gross) : rule.basis === "fixed" ? 0 : money(ctx.net);
  const percentComponent =
    rule.calc === "fixed" ? 0 : money(basisAmount * (rule.percent / 100));
  const fixedComponent = rule.calc === "percent" ? 0 : money(rule.fixedFee);

  const raw = money(percentComponent + fixedComponent);
  const flooredValue = rule.minFee > 0 ? Math.max(raw, rule.minFee) : raw;
  const cappedValue = rule.maxFee > 0 ? Math.min(flooredValue, rule.maxFee) : flooredValue;
  const commission = money(Math.max(0, cappedValue));

  const parts: string[] = [];
  if (rule.calc !== "fixed") {
    parts.push(`${rule.percent}% of ${BASIS_LABELS[rule.basis].toLowerCase()}`);
  }
  if (rule.calc !== "percent") parts.push(`$${rule.fixedFee.toFixed(2)} fixed`);
  if (rule.minFee > 0) parts.push(`min $${rule.minFee.toFixed(2)}`);
  if (rule.maxFee > 0) parts.push(`max $${rule.maxFee.toFixed(2)}`);

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    scope: rule.scope,
    basis: rule.basis,
    basisAmount,
    rate: basisAmount > 0 ? money((commission / basisAmount) * 100) : rule.percent,
    percentComponent,
    fixedComponent,
    commission,
    minFeeApplied: rule.minFee > 0 && raw < rule.minFee,
    maxFeeApplied: rule.maxFee > 0 && flooredValue > rule.maxFee,
    explanation: `${SCOPE_LABELS[rule.scope]} rule “${rule.name}” — ${parts.join(", ")}.`,
  };
}

/**
 * The single entry point. Returns the winning rule's arithmetic, or the legacy
 * merchant/product fallback when nothing matches — so behaviour with an empty
 * rule table is identical to before this file existed.
 */
export function resolveCommission(ctx: CommissionContext): CommissionResolution {
  const rule = matchingRules(ctx)[0];
  if (rule) return applyRule(rule, ctx);

  const rate = commissionRateFallback(ctx.productKind, ctx.merchantRate);
  const basisAmount = money(ctx.net);
  return {
    ruleName: ctx.merchantRate
      ? "Merchant negotiated rate"
      : "Platform default rate",
    scope: "default",
    basis: "net",
    basisAmount,
    rate,
    percentComponent: money(basisAmount * (rate / 100)),
    fixedComponent: 0,
    commission: money(basisAmount * (rate / 100)),
    minFeeApplied: false,
    maxFeeApplied: false,
    explanation: ctx.merchantRate
      ? `No rule matched — the merchant's negotiated ${rate}% applied.`
      : `No rule matched — the platform default for ${ctx.productKind ?? "this product"} (${rate}%) applied.`,
  };
}

/** The pre-rules behaviour, kept as the last resort. */
function commissionRateFallback(kind?: ProductKind, merchantRate?: number): number {
  if (typeof merchantRate === "number" && merchantRate > 0) return merchantRate;
  if (!kind) return PRICING_CONFIG.defaultCommissionRate;
  return (
    PRICING_CONFIG.commissionByProduct[kind] ?? PRICING_CONFIG.defaultCommissionRate
  );
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export type CommissionRuleInput = Omit<
  CommissionRule,
  "id" | "createdAt" | "updatedAt" | "updatedBy"
>;

/**
 * Strip the stored-only fields off a rule so it can be edited, proposed in a
 * change request or diffed against another version.
 */
export function toRuleInput(rule: CommissionRule): CommissionRuleInput {
  const copy: Partial<CommissionRule> = { ...rule };
  delete copy.id;
  delete copy.createdAt;
  delete copy.updatedAt;
  delete copy.updatedBy;
  return copy as CommissionRuleInput;
}

export const commissionRuleStore = {
  list(): CommissionRule[] {
    const at = new Date().toISOString();
    return getState()
      .commissionRules.map((r) => ({ ...r, status: statusForWindow(r, at) }))
      .sort(
        (a, b) =>
          SCOPE_SPECIFICITY[b.scope] - SCOPE_SPECIFICITY[a.scope] ||
          a.targetLabel.localeCompare(b.targetLabel),
      );
  },

  get(id: string): CommissionRule | undefined {
    return getState().commissionRules.find((r) => r.id === id);
  },

  create(input: CommissionRuleInput, by: string): CommissionRule {
    const now = new Date().toISOString();
    const rule: CommissionRule = {
      ...input,
      id: nextId("cmr"),
      status: statusForWindow(input, now),
      createdAt: now,
      updatedAt: now,
      updatedBy: by,
    };
    mutate((draft) => draft.commissionRules.unshift(rule));
    return rule;
  },

  /** Returns the row before and after, so the caller can audit the delta. */
  update(
    id: string,
    patch: Partial<CommissionRuleInput>,
    by: string,
  ): { before: CommissionRule; after: CommissionRule } | undefined {
    return mutate((draft) => {
      const row = draft.commissionRules.find((r) => r.id === id);
      if (!row) return undefined;
      const before = structuredClone(row);
      Object.assign(row, patch);
      row.status = statusForWindow(row);
      row.updatedAt = new Date().toISOString();
      row.updatedBy = by;
      return { before, after: structuredClone(row) };
    });
  },

  remove(id: string): CommissionRule | undefined {
    return mutate((draft) => {
      const index = draft.commissionRules.findIndex((r) => r.id === id);
      if (index < 0) return undefined;
      return draft.commissionRules.splice(index, 1)[0];
    });
  },
};

/** A one-line summary of a rule's charge, for tables. */
export function describeRule(rule: CommissionRule): string {
  const parts: string[] = [];
  if (rule.calc !== "fixed") parts.push(`${rule.percent}%`);
  if (rule.calc !== "percent") parts.push(`$${rule.fixedFee.toFixed(2)}`);
  const bounds: string[] = [];
  if (rule.minFee > 0) bounds.push(`min $${rule.minFee}`);
  if (rule.maxFee > 0) bounds.push(`max $${rule.maxFee}`);
  return `${parts.join(" + ")}${bounds.length ? ` (${bounds.join(", ")})` : ""}`;
}
