/**
 * Rule matching, ordering and validation — the pure half of the pricing engine.
 *
 * Nothing here reads the store or the clock. Given a rule and a context it
 * answers "does this apply", "what does it do to this number" and "is this rule
 * even coherent" — which is what lets the engine, the calendar preview and the
 * rule form all agree without any of them re-implementing the logic.
 */

import type { BookingVertical } from "@/types/booking";
import { money } from "../money";
import type {
  AdjustmentType,
  CalculationMode,
  PricingConfiguration,
  PricingRule,
  PricingRuleAdjustment,
  PricingRuleCondition,
  PricingRuleType,
  RatePlanId,
} from "./types";
import { DAILY_RULE_TYPES, PRICING_RULE_TYPE_LABELS, STAY_RULE_TYPES } from "./types";

const DAY_MS = 86_400_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// ---------------------------------------------------------------------------
// Date helpers — UTC, day granularity, no clock
// ---------------------------------------------------------------------------

/** Is this a real `YYYY-MM-DD` date? Rejects 2026-02-30 as well as gibberish. */
export function isValidISODate(iso: string): boolean {
  if (!ISO_DATE.test(iso)) return false;
  const [y, m, d] = iso.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1) return false;
  // `Date.UTC` normalises overflow, so a round-trip catches 31 April and
  // 29 February in a common year while accepting it in a leap year.
  const stamp = Date.UTC(y, m - 1, d);
  const back = new Date(stamp);
  return (
    back.getUTCFullYear() === y && back.getUTCMonth() === m - 1 && back.getUTCDate() === d
  );
}

/** Weekday of an ISO date, 0 = Sunday. Returns 0 for an unparseable date. */
export function weekdayOf(iso: string): number {
  if (!isValidISODate(iso)) return 0;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Whole days from `from` to `to`. Negative when `to` precedes `from`. */
export function daysBetween(from: string, to: string): number {
  if (!isValidISODate(from) || !isValidISODate(to)) return 0;
  const [ay, am, ad] = from.split("-").map(Number);
  const [by, bm, bd] = to.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / DAY_MS);
}

/** Today as `YYYY-MM-DD`, in UTC so server and client agree within a day. */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** `count` consecutive ISO dates from `start`, crossing months and years. */
export function isoRange(start: string, count: number): string[] {
  if (!isValidISODate(start)) return [];
  const [y, m, d] = start.split("-").map(Number);
  const anchor = Date.UTC(y, m - 1, d);
  return Array.from({ length: Math.max(0, count) }, (_, i) =>
    new Date(anchor + i * DAY_MS).toISOString().slice(0, 10),
  );
}

// ---------------------------------------------------------------------------
// Scope & conditions
// ---------------------------------------------------------------------------

/** An empty list means "everything"; otherwise the value must be in it. */
function scopeAllows<T>(list: readonly T[] | undefined, value: T | undefined): boolean {
  if (!list || list.length === 0) return true;
  if (value === undefined) return false;
  return list.includes(value);
}

export interface ScopeTarget {
  propertyId?: string;
  roomTypeId?: string;
  ratePlanId?: RatePlanId;
  vertical?: BookingVertical;
}

/** Does the rule reach this property/room/plan/vertical? */
export function scopeMatches(rule: PricingRule, target: ScopeTarget): boolean {
  return (
    scopeAllows(rule.scope.propertyIds, target.propertyId) &&
    scopeAllows(rule.scope.roomTypeIds, target.roomTypeId) &&
    scopeAllows(rule.scope.ratePlanIds, target.ratePlanId) &&
    scopeAllows(rule.scope.verticals, target.vertical)
  );
}

/** Everything a condition can be tested against. All fields optional. */
export interface ConditionTarget {
  date?: string;
  occupancy?: number;
  leadTimeDays?: number;
  nights?: number;
  guests?: number;
  weekendDays?: number[];
}

/**
 * Does the condition hold?
 *
 * Every present field must match — conditions are ANDed. Absent fields are not
 * constraints, so `{}` matches everything, which is what a blanket discount
 * wants. A field the target can't answer (no occupancy supplied for an
 * occupancy band) fails closed: a rule never fires on an unknown.
 */
export function conditionMatches(
  condition: PricingRuleCondition,
  target: ConditionTarget,
): boolean {
  const {
    dateFrom,
    dateTo,
    weekdays,
    occupancyMin,
    occupancyMax,
    leadTimeMinDays,
    leadTimeMaxDays,
    nightsMin,
    nightsMax,
    guestsMin,
    guestsMax,
  } = condition;

  if (dateFrom || dateTo || (weekdays && weekdays.length > 0)) {
    if (!target.date) return false;
    // ISO dates compare correctly as strings, which keeps season windows free
    // of timezone arithmetic across month and year boundaries.
    if (dateFrom && target.date < dateFrom) return false;
    if (dateTo && target.date > dateTo) return false;
    if (weekdays && weekdays.length > 0 && !weekdays.includes(weekdayOf(target.date))) {
      return false;
    }
  }

  if (occupancyMin !== undefined || occupancyMax !== undefined) {
    const occupancy = target.occupancy;
    if (occupancy === undefined || !Number.isFinite(occupancy)) return false;
    if (occupancyMin !== undefined && occupancy < occupancyMin) return false;
    // Upper bound is exclusive so contiguous bands (0–0.5, 0.5–0.8) can't both
    // fire on exactly 0.5. The top band uses 1.01 to keep 100% inside it.
    if (occupancyMax !== undefined && occupancy >= occupancyMax) return false;
  }

  if (leadTimeMinDays !== undefined || leadTimeMaxDays !== undefined) {
    const lead = target.leadTimeDays;
    if (lead === undefined || !Number.isFinite(lead)) return false;
    if (leadTimeMinDays !== undefined && lead < leadTimeMinDays) return false;
    if (leadTimeMaxDays !== undefined && lead > leadTimeMaxDays) return false;
  }

  if (nightsMin !== undefined || nightsMax !== undefined) {
    const nights = target.nights;
    if (nights === undefined || !Number.isFinite(nights)) return false;
    if (nightsMin !== undefined && nights < nightsMin) return false;
    if (nightsMax !== undefined && nights > nightsMax) return false;
  }

  if (guestsMin !== undefined || guestsMax !== undefined) {
    const guests = target.guests;
    if (guests === undefined || !Number.isFinite(guests)) return false;
    if (guestsMin !== undefined && guests < guestsMin) return false;
    if (guestsMax !== undefined && guests > guestsMax) return false;
  }

  return true;
}

/**
 * A weekend rule with no explicit weekdays inherits the configuration's — which
 * is the point of making the weekend configurable in the first place. Anything
 * else uses the rule's own condition unchanged.
 */
export function effectiveCondition(
  rule: PricingRule,
  config: Pick<PricingConfiguration, "weekendDays">,
): PricingRuleCondition {
  if (rule.type !== "weekend") return rule.condition;
  if (rule.condition.weekdays && rule.condition.weekdays.length > 0) return rule.condition;
  return { ...rule.condition, weekdays: config.weekendDays };
}

/** Is the rule live and of a kind the engine should be looking at right now? */
export function isRuleEligible(
  rule: PricingRule,
  config: Pick<PricingConfiguration, "enabled" | "demandPricingEnabled" | "guestPricingEnabled">,
): boolean {
  if (rule.status !== "active") return false;
  if (!config.enabled) return false;
  if (rule.type === "demand" && !config.demandPricingEnabled) return false;
  if (rule.type === "guest" && !config.guestPricingEnabled) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Ordering
// ---------------------------------------------------------------------------

/**
 * Tie-break order when two rules share a priority. Deliberately fixed rather
 * than "whatever the array happened to hold", because a pricing engine that
 * reorders itself between two renders is not a pricing engine.
 */
const TYPE_RANK: Record<PricingRuleType, number> = {
  holiday: 0,
  season: 1,
  demand: 2,
  weekend: 3,
  booking_window: 4,
  length_of_stay: 5,
  guest: 6,
  discount: 7,
};

/** Sort rules into the exact order the engine will run them. */
export function orderRules<T extends PricingRule>(rules: readonly T[]): T[] {
  return [...rules].sort(
    (a, b) =>
      b.priority - a.priority ||
      TYPE_RANK[a.type] - TYPE_RANK[b.type] ||
      a.name.localeCompare(b.name) ||
      a.id.localeCompare(b.id),
  );
}

export function isDailyRule(rule: PricingRule): boolean {
  return DAILY_RULE_TYPES.includes(rule.type);
}

export function isStayRule(rule: PricingRule): boolean {
  return STAY_RULE_TYPES.includes(rule.type);
}

// ---------------------------------------------------------------------------
// Adjustment arithmetic
// ---------------------------------------------------------------------------

/**
 * Apply one adjustment.
 *
 * `base` is the untouched reference the rule measures against in
 * `base_relative` mode; `current` is the running price. Both are needed because
 * "+20% weekend, +30% season" means +50% of base, not ×1.2×1.3 — and a merchant
 * who *wants* compounding says so with `sequential`.
 *
 * Never returns NaN, Infinity or a negative price: a misconfigured rule makes a
 * price wrong, it must not make it impossible.
 */
export function applyAdjustment(
  adjustment: PricingRuleAdjustment,
  mode: CalculationMode,
  base: number,
  current: number,
): number {
  const safeBase = Number.isFinite(base) ? Math.max(0, base) : 0;
  const safeCurrent = Number.isFinite(current) ? Math.max(0, current) : safeBase;
  const value = Number.isFinite(adjustment.value) ? adjustment.value : 0;
  const reference = mode === "sequential" ? safeCurrent : safeBase;

  let next: number;
  switch (adjustment.type) {
    case "percent":
      next = safeCurrent + reference * (value / 100);
      break;
    case "fixed":
      next = safeCurrent + value;
      break;
    case "multiplier":
      // A zero or negative multiplier would silently zero out a rate; treat it
      // as a misconfiguration and leave the price alone.
      next = value > 0 ? reference * value : safeCurrent;
      break;
    case "set":
      next = Math.max(0, value);
      break;
    default:
      next = safeCurrent;
  }

  if (!Number.isFinite(next)) return safeCurrent;
  return Math.max(0, next);
}

/** "Peak season +30%" — the one-liner shown to merchants and travellers. */
export function describeAdjustment(
  name: string,
  adjustment: PricingRuleAdjustment,
  mode: CalculationMode,
  currency = "USD",
): string {
  const { type, value } = adjustment;
  if (mode === "override" || type === "set") {
    return `${name} — fixed rate`;
  }
  if (type === "percent") {
    const sign = value >= 0 ? "+" : "−";
    return `${name} ${sign}${Math.abs(value)}%`;
  }
  if (type === "multiplier") {
    return `${name} ×${value}`;
  }
  const sign = value >= 0 ? "+" : "−";
  return `${name} ${sign}${currency} ${Math.abs(value).toFixed(0)}`;
}

/** Round to the configuration's increment, then to cents. */
export function roundRate(value: number, increment: number): number {
  if (!Number.isFinite(value)) return 0;
  const safe = Math.max(0, value);
  if (!Number.isFinite(increment) || increment <= 0) return money(safe);
  return money(Math.round(safe / increment) * increment);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface RuleProblem {
  field: string;
  message: string;
  severity: "error" | "warning";
}

const NEEDS_DATES: readonly PricingRuleType[] = ["season", "holiday"];
const NEEDS_OCCUPANCY: readonly PricingRuleType[] = ["demand"];

/**
 * Validate a rule before it is stored.
 *
 * Errors block the save; warnings are shown but let the merchant proceed — an
 * overlapping season is often deliberate (a holiday inside a peak window), and
 * refusing it would be wrong.
 */
export function validateRule(
  rule: Pick<
    PricingRule,
    "name" | "type" | "condition" | "adjustment" | "priority" | "minStay" | "maxStay"
  >,
  existing: readonly PricingRule[] = [],
  selfId?: string,
): RuleProblem[] {
  const problems: RuleProblem[] = [];
  const { condition, adjustment } = rule;

  if (!rule.name.trim()) {
    problems.push({ field: "name", message: "Give the rule a name.", severity: "error" });
  }

  for (const [field, value] of [
    ["condition.dateFrom", condition.dateFrom],
    ["condition.dateTo", condition.dateTo],
  ] as const) {
    if (value && !isValidISODate(value)) {
      problems.push({ field, message: "Not a valid date.", severity: "error" });
    }
  }

  if (
    condition.dateFrom &&
    condition.dateTo &&
    isValidISODate(condition.dateFrom) &&
    isValidISODate(condition.dateTo) &&
    condition.dateTo < condition.dateFrom
  ) {
    problems.push({
      field: "condition.dateTo",
      message: "The end date is before the start date.",
      severity: "error",
    });
  }

  if (NEEDS_DATES.includes(rule.type) && !condition.dateFrom && !condition.dateTo) {
    problems.push({
      field: "condition.dateFrom",
      message: `A ${PRICING_RULE_TYPE_LABELS[rule.type].toLowerCase()} needs a date range.`,
      severity: "error",
    });
  }

  if (NEEDS_OCCUPANCY.includes(rule.type)) {
    if (condition.occupancyMin === undefined && condition.occupancyMax === undefined) {
      problems.push({
        field: "condition.occupancyMin",
        message: "Set the occupancy band this rule reacts to.",
        severity: "error",
      });
    }
    if (
      condition.occupancyMin !== undefined &&
      condition.occupancyMax !== undefined &&
      condition.occupancyMax <= condition.occupancyMin
    ) {
      problems.push({
        field: "condition.occupancyMax",
        message: "The upper bound must be above the lower bound.",
        severity: "error",
      });
    }
  }

  for (const [field, value] of [
    ["condition.occupancyMin", condition.occupancyMin],
    ["condition.occupancyMax", condition.occupancyMax],
  ] as const) {
    if (value !== undefined && (!Number.isFinite(value) || value < 0 || value > 1.01)) {
      problems.push({
        field,
        message: "Occupancy is a share between 0 and 1.",
        severity: "error",
      });
    }
  }

  if (!Number.isFinite(adjustment.value)) {
    problems.push({
      field: "adjustment.value",
      message: "Enter a number.",
      severity: "error",
    });
  } else {
    if (adjustment.type === "percent" && Math.abs(adjustment.value) > 500) {
      problems.push({
        field: "adjustment.value",
        message: "That is more than a 500% move — check the value.",
        severity: "error",
      });
    }
    if (adjustment.type === "percent" && adjustment.value <= -100) {
      problems.push({
        field: "adjustment.value",
        message: "A discount of 100% or more would make the night free.",
        severity: "error",
      });
    }
    if (adjustment.type === "multiplier" && adjustment.value <= 0) {
      problems.push({
        field: "adjustment.value",
        message: "A multiplier must be greater than zero.",
        severity: "error",
      });
    }
    if (adjustment.type === "set" && adjustment.value <= 0) {
      problems.push({
        field: "adjustment.value",
        message: "A fixed rate must be greater than zero.",
        severity: "error",
      });
    }
    if (adjustment.type === "percent" && Math.abs(adjustment.value) > 100) {
      problems.push({
        field: "adjustment.value",
        message: "That more than doubles the rate. Make sure it is intended.",
        severity: "warning",
      });
    }
  }

  if (rule.minStay > 0 && rule.maxStay > 0 && rule.maxStay < rule.minStay) {
    problems.push({
      field: "maxStay",
      message: "Maximum stay is shorter than the minimum.",
      severity: "error",
    });
  }

  if (!Number.isFinite(rule.priority) || rule.priority < 0 || rule.priority > 1000) {
    problems.push({
      field: "priority",
      message: "Priority runs from 0 to 1000.",
      severity: "error",
    });
  }

  // --- overlap warnings ----------------------------------------------------
  const overlaps = existing.filter(
    (other) =>
      other.id !== selfId &&
      other.status === "active" &&
      other.type === rule.type &&
      rangesOverlap(other.condition, condition),
  );
  for (const other of overlaps) {
    problems.push({
      field: "condition.dateFrom",
      message:
        other.priority === rule.priority
          ? `Overlaps "${other.name}", which has the same priority — the order they run in is decided by name.`
          : `Overlaps "${other.name}" (priority ${other.priority}).`,
      severity: "warning",
    });
  }

  return problems;
}

/** Do two conditions cover any of the same dates? Open ends count as infinite. */
export function rangesOverlap(a: PricingRuleCondition, b: PricingRuleCondition): boolean {
  const aFrom = a.dateFrom ?? "0000-01-01";
  const aTo = a.dateTo ?? "9999-12-31";
  const bFrom = b.dateFrom ?? "0000-01-01";
  const bTo = b.dateTo ?? "9999-12-31";
  if (aFrom > bTo || bFrom > aTo) return false;
  // Weekday-restricted rules only clash when they share a weekday.
  const aDays = a.weekdays ?? [];
  const bDays = b.weekdays ?? [];
  if (aDays.length > 0 && bDays.length > 0) {
    return aDays.some((day) => bDays.includes(day));
  }
  return true;
}

/** Which adjustment types make sense for a rule kind — drives the form. */
export function adjustmentTypesFor(type: PricingRuleType): AdjustmentType[] {
  if (type === "discount") return ["percent", "fixed"];
  if (type === "guest") return ["fixed", "percent"];
  return ["percent", "fixed", "multiplier", "set"];
}
