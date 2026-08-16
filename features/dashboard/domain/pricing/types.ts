/**
 * Dynamic pricing — the data model.
 *
 * Everything the engine needs to turn a room's base rate into an effective
 * nightly rate, and a set of nights into a bookable price, is described here.
 * The shapes are deliberately serialisable and free of behaviour: a real API can
 * return them verbatim, and the engine in `engine.ts` is a pure function of
 * them.
 *
 * ## The vocabulary
 *
 *   RatePlan       a commercial package sold against a room (Standard,
 *                  Non-refundable, Breakfast, Corporate…). Carries the meal and
 *                  refund terms, the stay limits and a price factor.
 *   PricingRule    one configurable reason a price moves. Seasons, holidays,
 *                  weekends, demand, booking window, length of stay, guest
 *                  count and discounts are all the *same* record with a
 *                  different `type` — which is what lets a new kind of rule be
 *                  added later without touching the booking system.
 *   PricingConfiguration
 *                  the switches that are properties of a place rather than of a
 *                  rule: which weekdays count as the weekend, whether dynamic
 *                  pricing is on at all, how far a price may move, rounding.
 *   DailyRate      the engine's answer for one night, with the full trace of
 *                  which rules fired, in what order, and what each one did.
 *   BookingPriceCalculation
 *                  the engine's answer for a stay: every night, the stay-level
 *                  adjustments, the discounts and the room subtotal.
 *
 * All amounts are in the platform's base currency (USD), like every other price
 * in the domain. Display currency and locale are applied at the edge by
 * `features/i18n` — the engine never formats.
 */

import type { BookingVertical } from "@/types/booking";
import type { CancellationPolicyId } from "../types";

// ---------------------------------------------------------------------------
// Rate plans
// ---------------------------------------------------------------------------

/**
 * Rate-plan ids are open strings: the four shipped plans have stable slugs, and
 * a merchant may create their own. Nothing switches exhaustively on this.
 */
export type RatePlanId = string;

export const MEAL_PLANS = [
  "none",
  "breakfast",
  "half_board",
  "full_board",
  "all_inclusive",
] as const;

export type MealPlan = (typeof MEAL_PLANS)[number];

export const MEAL_PLAN_LABELS: Record<MealPlan, string> = {
  none: "Room only",
  breakfast: "Breakfast included",
  half_board: "Half board",
  full_board: "Full board",
  all_inclusive: "All inclusive",
};

export type RatePlanStatus = "active" | "inactive" | "archived";

export const RATE_PLAN_STATUS_LABELS: Record<RatePlanStatus, string> = {
  active: "Active",
  inactive: "Disabled",
  archived: "Archived",
};

/**
 * A sellable commercial package.
 *
 * `priceFactor` is how the plan prices against the room's effective nightly
 * rate — 0.86 for a non-refundable, 1.14 for one with breakfast. A plan may
 * instead pin an absolute `baseRate`, which replaces the room baseline entirely
 * (corporate contracts are quoted that way); pricing rules still apply on top,
 * so a contracted rate still moves with a holiday unless it is scoped out.
 */
export interface RatePlan {
  id: RatePlanId;
  name: string;
  description: string;
  /** Room effective rate × this. Ignored when `baseRate` is set. */
  priceFactor: number;
  /** Absolute nightly base rate, replacing the room baseline. */
  baseRate?: number;
  currency: string;
  cancellationPolicyId: CancellationPolicyId;
  mealPlan: MealPlan;
  /** Derived from {@link mealPlan}; kept because the whole product reads it. */
  includesBreakfast: boolean;
  refundable: boolean;
  minStay: number;
  maxStay: number;
  /** Weekdays (0 = Sunday) a stay may not *start* on. */
  closedToArrival: number[];
  /** Weekdays a stay may not *end* on. */
  closedToDeparture: number[];
  /** Earliest a stay may be booked, in days before arrival. 0 = no limit. */
  minAdvanceDays: number;
  /** Furthest ahead a stay may be booked, in days. 0 = no limit. */
  maxAdvanceDays: number;
  status: RatePlanStatus;
  /** Verticals that sell this plan. Empty = every vertical. */
  verticals: BookingVertical[];
  /** Properties that sell it. Empty = every property. */
  propertyIds: string[];
  /** Room types it may be sold against. Empty = every room. */
  roomTypeIds: string[];
  badge?: string;
  /** Perks shown as ticks on the rate card. */
  inclusions: string[];
  /** Shipped with the product — may be disabled but not deleted. */
  builtIn: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export type RatePlanInput = Omit<
  RatePlan,
  "id" | "builtIn" | "createdAt" | "updatedAt" | "updatedBy" | "includesBreakfast"
>;

// ---------------------------------------------------------------------------
// Pricing rules
// ---------------------------------------------------------------------------

/**
 * The kinds of rule the engine understands.
 *
 * The first four are *daily*: they resolve a single night's rate and are
 * evaluated by {@link import("./engine").resolveDailyRate}. The rest are
 * *stay-level*: they need the whole booking (how far ahead, how long, how many
 * people) and are evaluated by
 * {@link import("./calculators").calculateStayPrice}.
 */
export const PRICING_RULE_TYPES = [
  "season",
  "holiday",
  "weekend",
  "demand",
  "booking_window",
  "length_of_stay",
  "guest",
  "discount",
] as const;

export type PricingRuleType = (typeof PRICING_RULE_TYPES)[number];

/** Rule types that resolve one night's rate. */
export const DAILY_RULE_TYPES: readonly PricingRuleType[] = [
  "season",
  "holiday",
  "weekend",
  "demand",
];

/** Rule types that need the whole stay. */
export const STAY_RULE_TYPES: readonly PricingRuleType[] = [
  "booking_window",
  "length_of_stay",
  "guest",
  "discount",
];

export const PRICING_RULE_TYPE_LABELS: Record<PricingRuleType, string> = {
  season: "Season",
  holiday: "Holiday",
  weekend: "Weekend",
  demand: "Demand / occupancy",
  booking_window: "Booking window",
  length_of_stay: "Length of stay",
  guest: "Guest count",
  discount: "Discount",
};

export const PRICING_RULE_TYPE_HINTS: Record<PricingRuleType, string> = {
  season: "A date range that carries its own rate — peak, shoulder or low.",
  holiday: "A named date or short range: Eid, Christmas, Pohela Boishakh.",
  weekend: "The weekdays this market treats as the weekend.",
  demand: "Moves the rate with how full the night already is.",
  booking_window: "Rewards booking early, or charges for booking late.",
  length_of_stay: "Discounts longer stays.",
  guest: "Charges for guests beyond the room's included occupancy.",
  discount: "A blanket reduction on the room subtotal.",
};

/** How an adjustment changes a price. */
export type AdjustmentType = "percent" | "fixed" | "multiplier" | "set";

export const ADJUSTMENT_TYPE_LABELS: Record<AdjustmentType, string> = {
  percent: "Percentage",
  fixed: "Fixed amount",
  multiplier: "Multiplier",
  set: "Set price",
};

/**
 * What a rule does to a price.
 *
 * `percent` +30 raises by 30%, −10 discounts by 10%.
 * `fixed`   +25 adds 25 to the nightly rate (or, on a stay rule, per night per
 *           unit — the calculators say so explicitly).
 * `multiplier` 1.3 multiplies.
 * `set`     replaces the price outright.
 */
export interface PricingRuleAdjustment {
  type: AdjustmentType;
  value: number;
}

/**
 * When a rule applies.
 *
 * Every field is optional and every present field must match — conditions are
 * ANDed. A rule with an empty condition matches every night in its scope, which
 * is what a blanket discount wants.
 */
export interface PricingRuleCondition {
  /** Inclusive ISO date the rule starts applying. */
  dateFrom?: string;
  /** Inclusive ISO date it stops. */
  dateTo?: string;
  /** Weekdays it applies to, 0 = Sunday. Empty/absent = every day. */
  weekdays?: number[];
  /** Occupancy band, 0–1 inclusive of the lower bound, exclusive of the upper. */
  occupancyMin?: number;
  occupancyMax?: number;
  /** Days between booking and check-in, inclusive. */
  leadTimeMinDays?: number;
  leadTimeMaxDays?: number;
  /** Nights in the stay, inclusive. */
  nightsMin?: number;
  nightsMax?: number;
  /** Guests in the party, inclusive. */
  guestsMin?: number;
  guestsMax?: number;
}

/** Which products a rule reaches. An empty list means "no restriction". */
export interface PricingRuleScope {
  propertyIds: string[];
  roomTypeIds: string[];
  ratePlanIds: RatePlanId[];
  verticals: BookingVertical[];
}

export type PricingRuleStatus = "active" | "paused" | "archived";

export const PRICING_RULE_STATUS_LABELS: Record<PricingRuleStatus, string> = {
  active: "Active",
  paused: "Paused",
  archived: "Archived",
};

/**
 * How a rule's adjustment is measured, which is the whole of conflict
 * resolution once priority has ordered the rules.
 *
 *   `base_relative`  measured against the *base* rate, so two +20% rules add to
 *                    +40% rather than compounding to +44%. The default, because
 *                    it is what a revenue manager means by "weekend +20%".
 *   `sequential`     measured against the running price, so rules compound.
 *   `override`       replaces the price and stops every lower-priority rule.
 */
export type CalculationMode = "base_relative" | "sequential" | "override";

export const CALCULATION_MODE_LABELS: Record<CalculationMode, string> = {
  base_relative: "Relative to base rate",
  sequential: "Compound on running price",
  override: "Override — replaces the price",
};

/**
 * One configurable reason a price moves.
 *
 * Priority orders the rules; `stackable` decides whether the ones behind it
 * still get a turn. See `engine.ts` for the exact, documented order.
 */
export interface PricingRule {
  id: string;
  name: string;
  description: string;
  type: PricingRuleType;
  scope: PricingRuleScope;
  condition: PricingRuleCondition;
  adjustment: PricingRuleAdjustment;
  /** Higher runs first. */
  priority: number;
  /** When false, no lower-priority rule of any kind applies after this one. */
  stackable: boolean;
  calculationMode: CalculationMode;
  status: PricingRuleStatus;
  /** Minimum nights this rule imposes on its dates. 0 = none. */
  minStay: number;
  /** Maximum nights. 0 = none. */
  maxStay: number;
  /** Stays may not start on these dates/weekdays while the rule applies. */
  closedToArrival: boolean;
  closedToDeparture: boolean;
  /** Free-text note kept for the audit trail. */
  note?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export type PricingRuleInput = Omit<
  PricingRule,
  "id" | "createdAt" | "updatedAt" | "updatedBy"
>;

/**
 * Narrowed aliases. They carry no extra fields — a season *is* a pricing rule
 * whose `type` is `"season"` — but naming them makes call sites read the way
 * the business talks.
 */
export type Season = PricingRule & { type: "season" };
export type Holiday = PricingRule & { type: "holiday" };
export type WeekendRule = PricingRule & { type: "weekend" };
export type DynamicPricingRule = PricingRule & { type: "demand" };
export type BookingWindowRule = PricingRule & { type: "booking_window" };
export type LengthOfStayRule = PricingRule & { type: "length_of_stay" };
export type GuestPricingRule = PricingRule & { type: "guest" };
export type DiscountRule = PricingRule & { type: "discount" };

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * The switches that belong to a market rather than to a rule.
 *
 * One row is the platform default (`scopeId: null`); a merchant may add a row
 * per property that overrides it. `weekendDays` is the reason this exists:
 * Friday and Saturday are the weekend in much of the world, and hard-coding
 * Saturday/Sunday would have quietly mispriced half the catalogue.
 */
export interface PricingConfiguration {
  id: string;
  /** Property this applies to; `null` is the platform default. */
  scopeId: string | null;
  label: string;
  /** Master switch. Off = base rate + manual overrides only. */
  enabled: boolean;
  /** Weekdays treated as the weekend, 0 = Sunday. */
  weekendDays: number[];
  currency: string;
  /** Demand pricing may be turned off independently — it is the noisiest rule. */
  demandPricingEnabled: boolean;
  /** Guest-based pricing is not something every property does. */
  guestPricingEnabled: boolean;
  /** Floor, as a multiple of the base rate. 0.5 = never below half. */
  minRateFactor: number;
  /** Ceiling, as a multiple of the base rate. */
  maxRateFactor: number;
  /**
   * Round the effective nightly rate to this increment (0 = cents). 1 rounds to
   * whole units, 5 to the nearest five.
   */
  roundingIncrement: number;
  updatedAt: string;
  updatedBy: string;
}

export type PricingConfigurationInput = Omit<
  PricingConfiguration,
  "id" | "updatedAt" | "updatedBy"
>;

/** The platform-default configuration id. */
export const GLOBAL_PRICING_CONFIG_ID = "pcfg_global";

// ---------------------------------------------------------------------------
// Manual override
// ---------------------------------------------------------------------------

/**
 * A merchant pinning one night's rate by hand.
 *
 * Stored on the existing inventory override row (`domain/inventory.ts`) rather
 * than in a table of its own, so the rate calendar, the booking engine and the
 * revenue manager all read one record. This is the read model the engine and
 * the UI use.
 */
export interface ManualPriceOverride {
  propertyId: string;
  roomTypeId: string;
  date: string;
  /** The pinned nightly rate. */
  price: number;
  /** What the engine would have charged, captured when the pin was set. */
  calculatedPrice?: number;
  reason?: string;
  updatedAt: string;
  updatedBy: string;
}

// ---------------------------------------------------------------------------
// Engine output
// ---------------------------------------------------------------------------

/** One rule's contribution, kept so every price can explain itself. */
export interface AppliedRule {
  ruleId: string;
  name: string;
  type: PricingRuleType | "rate_plan" | "manual_override";
  priority: number;
  mode: CalculationMode;
  adjustment: PricingRuleAdjustment;
  /** Price before this rule ran. */
  from: number;
  /** Price after. */
  to: number;
  /** Signed change, `to − from`. */
  amount: number;
  /** Customer-safe one-liner: "Peak season +30%". */
  label: string;
}

/** A rule that matched but did not fire, and why. */
export interface SkippedRule {
  ruleId: string;
  name: string;
  type: PricingRuleType;
  reason: string;
}

/** The visual/semantic markers a calendar cell shows for a night. */
export type DailyRateTag =
  | "normal"
  | "weekend"
  | "season"
  | "holiday"
  | "demand"
  | "discount"
  | "override";

export const DAILY_RATE_TAG_LABELS: Record<DailyRateTag, string> = {
  normal: "Standard rate",
  weekend: "Weekend",
  season: "Season",
  holiday: "Holiday",
  demand: "High demand",
  discount: "Discounted",
  override: "Manual override",
};

/** The engine's answer for one night. */
export interface DailyRate {
  date: string;
  /** 0 = Sunday. */
  weekday: number;
  isWeekend: boolean;
  currency: string;
  /** The room's untouched nightly rate, before any rule. */
  baseRate: number;
  /** What the night costs per unit, after every daily rule and any override. */
  effectiveRate: number;
  /** Rules that fired, in the order they ran. */
  applied: AppliedRule[];
  /** Rules that matched but were superseded, with the reason. */
  skipped: SkippedRule[];
  /** Occupancy the demand rules saw, 0–1. */
  occupancy: number;
  tags: DailyRateTag[];
  /** True when a merchant pinned this night by hand. */
  overridden: boolean;
  /** What the rules would have produced, when an override replaced them. */
  calculatedRate?: number;
  overrideReason?: string;
  /** Minimum nights the matched rules impose (0 = none). */
  minStay: number;
  /** True when the master switch or the property config turned rules off. */
  rulesDisabled: boolean;
}

/** One line of the customer-facing breakdown. */
export interface PriceBreakdownLine {
  key: string;
  label: string;
  /** Secondary text — "3 nights × $210", "Peak season +30%". */
  detail?: string;
  amount: number;
  kind: "charge" | "discount" | "fee" | "tax" | "total";
}

/** A stay's price, night by night, with everything that moved it. */
export interface BookingPriceCalculation {
  currency: string;
  ratePlanId: RatePlanId;
  ratePlanName: string;
  roomTypeId: string;
  units: number;
  guests: number;
  /** ISO date the quote was made from, for booking-window rules. */
  bookingDate: string;
  checkIn: string;
  checkOut: string;
  nightCount: number;
  nights: DailyRate[];
  /** Σ base rate × units. What the stay would cost with no rules at all. */
  baseSubtotal: number;
  /** Σ effective rate × units, before the rate plan and stay-level rules. */
  nightlySubtotal: number;
  /** The rate plan's own contribution. */
  ratePlanAdjustment: number;
  /** Booking-window, length-of-stay and guest rules, in the order they ran. */
  stayAdjustments: AppliedRule[];
  /** Discount rules, kept separate so the UI can show them as savings. */
  discounts: AppliedRule[];
  discountTotal: number;
  /** The bookable room total: nights × units, adjusted, less discounts. */
  roomSubtotal: number;
  averageNightly: number;
  /** Reasons a night costs what it does, deduplicated for display. */
  explanations: string[];
  /** Configuration or input problems that changed the answer. */
  warnings: string[];
  /** False when the inputs could not be priced at all. */
  valid: boolean;
}

/** Everything the engine needs to price one night. */
export interface DailyRateContext {
  date: string;
  /** The room's nightly base rate before any rule. */
  baseRate: number;
  propertyId: string;
  roomTypeId: string;
  ratePlanId: RatePlanId;
  vertical: BookingVertical;
  /** 0–1. Drives demand rules. */
  occupancy: number;
  /** A merchant's pinned rate for this night, when there is one. */
  override?: { price: number; reason?: string; calculatedPrice?: number };
  /** Rules to consider. Defaults to the live rule book. */
  rules?: PricingRule[];
  /** Configuration to apply. Defaults to the property's, else the platform's. */
  config?: PricingConfiguration;
}

/** Everything the engine needs to price a stay. */
export interface StayPriceContext {
  nights: DailyRate[];
  ratePlan: Pick<RatePlan, "id" | "name" | "priceFactor" | "baseRate" | "currency">;
  roomTypeId: string;
  propertyId: string;
  vertical: BookingVertical;
  units: number;
  guests: number;
  /** People one unit includes before guest rules bite. */
  includedGuests: number;
  /** ISO date the traveller is booking on. */
  bookingDate: string;
  checkIn: string;
  checkOut: string;
  rules?: PricingRule[];
  config?: PricingConfiguration;
}
