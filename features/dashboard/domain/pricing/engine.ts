/**
 * The pricing engine — one night in, one fully-explained rate out.
 *
 * ## Calculation order (this is the contract)
 *
 *   1. **Base rate.** The room's own nightly rate, or the rate plan's contracted
 *      rate when it pins one. Nothing before this point is configurable.
 *   2. **Eligibility.** Rules are dropped unless they are `active`, of a kind
 *      this configuration has switched on, in scope for the property / room /
 *      rate plan / vertical, and their condition holds for this night.
 *   3. **Ordering.** Surviving rules are sorted by `priority` descending, then
 *      by a fixed type rank (holiday, season, demand, weekend), then by name and
 *      id. The order never depends on array order or insertion time.
 *   4. **Override rules.** If the highest-priority survivor has
 *      `calculationMode: "override"`, it sets the rate and every other rule is
 *      recorded as skipped. This is how "Christmas is $400, full stop" is said.
 *   5. **Accumulation.** Otherwise each rule runs in order:
 *        · `base_relative` measures its percentage against the **base rate**, so
 *          weekend +20% and season +30% give +50%, not ×1.2×1.3. This is the
 *          default because it is what a revenue manager means.
 *        · `sequential` measures against the running price, so rules compound.
 *        · A rule with `stackable: false` is the last one to run — everything
 *          behind it is skipped with a reason, which is how a holiday beats the
 *          weekend it happens to fall on.
 *   6. **Guard rails.** The result is clamped between `minRateFactor` and
 *      `maxRateFactor` times the base rate, so a runaway rule cannot produce a
 *      free night or a five-figure one, then rounded to the configured
 *      increment.
 *   7. **Manual override.** A rate a merchant pinned by hand replaces the
 *      result outright and is recorded as such, keeping what the rules *would*
 *      have charged so the UI can show both. Nothing outranks a human.
 *
 * The function is pure: same inputs, same output, on the server and in the
 * browser. All the store-reading lives in `repository.ts`.
 */

import { money } from "../money";
import type {
  AppliedRule,
  DailyRate,
  DailyRateContext,
  DailyRateTag,
  PricingConfiguration,
  PricingRule,
  SkippedRule,
} from "./types";
import {
  applyAdjustment,
  conditionMatches,
  describeAdjustment,
  effectiveCondition,
  isDailyRule,
  isRuleEligible,
  isValidISODate,
  orderRules,
  roundRate,
  scopeMatches,
  weekdayOf,
} from "./rules";

/** The configuration used when a caller supplies none — permissive, inert. */
export const FALLBACK_CONFIG: PricingConfiguration = {
  id: "pcfg_fallback",
  scopeId: null,
  label: "Defaults",
  enabled: true,
  weekendDays: [5, 6],
  currency: "USD",
  demandPricingEnabled: true,
  guestPricingEnabled: true,
  minRateFactor: 0.4,
  maxRateFactor: 4,
  roundingIncrement: 1,
  updatedAt: "1970-01-01T00:00:00.000Z",
  updatedBy: "system",
};

/** The tag a rule type contributes to the calendar cell. */
const TYPE_TAG: Partial<Record<PricingRule["type"], DailyRateTag>> = {
  season: "season",
  holiday: "holiday",
  weekend: "weekend",
  demand: "demand",
};

/**
 * Resolve one night.
 *
 * Returns the rate *and* the reasoning: which rules fired, in what order, what
 * each one did to the number, and which matched but were superseded. Every
 * pricing surface in the product — the merchant calendar, the traveller's
 * breakdown, the checkout — renders that trace rather than recomputing it.
 */
export function resolveDailyRate(context: DailyRateContext): DailyRate {
  const config = context.config ?? FALLBACK_CONFIG;
  const currency = config.currency || "USD";
  const date = context.date;
  const weekday = weekdayOf(date);
  const isWeekend = config.weekendDays.includes(weekday);

  const baseRate = sanitize(context.baseRate);
  const occupancy = clamp01(context.occupancy);

  const applied: AppliedRule[] = [];
  const skipped: SkippedRule[] = [];
  const tags = new Set<DailyRateTag>();
  let minStay = 0;

  const rulesDisabled = !config.enabled;

  // --- 2. eligibility ------------------------------------------------------
  const candidates = !isValidISODate(date)
    ? []
    : (context.rules ?? []).filter((rule) => {
        if (!isDailyRule(rule)) return false;
        if (!isRuleEligible(rule, config)) return false;
        if (
          !scopeMatches(rule, {
            propertyId: context.propertyId,
            roomTypeId: context.roomTypeId,
            ratePlanId: context.ratePlanId,
            vertical: context.vertical,
          })
        ) {
          return false;
        }
        return conditionMatches(effectiveCondition(rule, config), {
          date,
          occupancy,
          weekendDays: config.weekendDays,
        });
      });

  // --- 3. ordering ---------------------------------------------------------
  const ordered = orderRules(candidates);

  let price = baseRate;

  // --- 4. an override rule short-circuits everything behind it -------------
  const leader = ordered[0];
  if (leader && leader.calculationMode === "override") {
    const next = applyAdjustment(leader.adjustment, "override", baseRate, price);
    applied.push(traceOf(leader, price, next, currency));
    price = next;
    const tag = TYPE_TAG[leader.type];
    if (tag) tags.add(tag);
    minStay = Math.max(minStay, leader.minStay);
    for (const rule of ordered.slice(1)) {
      skipped.push({
        ruleId: rule.id,
        name: rule.name,
        type: rule.type,
        reason: `"${leader.name}" overrides the rate for this date.`,
      });
    }
  } else {
    // --- 5. accumulation ---------------------------------------------------
    let closed: PricingRule | null = null;
    for (const rule of ordered) {
      if (closed) {
        skipped.push({
          ruleId: rule.id,
          name: rule.name,
          type: rule.type,
          reason: `"${closed.name}" does not stack with other rules.`,
        });
        continue;
      }
      const next = applyAdjustment(rule.adjustment, rule.calculationMode, baseRate, price);
      applied.push(traceOf(rule, price, next, currency));
      price = next;
      const tag = TYPE_TAG[rule.type];
      if (tag) tags.add(tag);
      if (rule.adjustment.value < 0) tags.add("discount");
      minStay = Math.max(minStay, rule.minStay);
      if (!rule.stackable) closed = rule;
    }
  }

  // --- 6. guard rails ------------------------------------------------------
  const floor = money(baseRate * Math.max(0, config.minRateFactor));
  const ceiling = money(baseRate * Math.max(config.minRateFactor, config.maxRateFactor));
  const clamped = Math.min(Math.max(price, floor), ceiling);
  if (clamped !== price && applied.length > 0) {
    const last = applied[applied.length - 1];
    last.to = clamped;
    last.amount = money(clamped - last.from);
    last.label += clamped < price ? " (capped)" : " (floored)";
  }
  let effectiveRate = roundRate(clamped, config.roundingIncrement);

  // --- 7. manual override --------------------------------------------------
  const override = context.override;
  const calculatedRate = effectiveRate;
  let overridden = false;
  if (override && Number.isFinite(override.price) && override.price >= 0) {
    const pinned = money(Math.max(0, override.price));
    applied.push({
      ruleId: "manual_override",
      name: "Manual override",
      type: "manual_override",
      priority: Number.MAX_SAFE_INTEGER,
      mode: "override",
      adjustment: { type: "set", value: pinned },
      from: effectiveRate,
      to: pinned,
      amount: money(pinned - effectiveRate),
      label: override.reason
        ? `Manual override — ${override.reason}`
        : "Manual override",
    });
    effectiveRate = pinned;
    overridden = true;
    tags.add("override");
  }

  if (tags.size === 0) tags.add("normal");
  if (isWeekend && !tags.has("weekend") && tags.has("normal")) {
    // The night *is* a weekend even when no weekend rule is configured; the
    // calendar still labels it, it just costs the same as a Tuesday.
    tags.delete("normal");
    tags.add("weekend");
  }

  return {
    date,
    weekday,
    isWeekend,
    currency,
    baseRate,
    effectiveRate,
    applied,
    skipped,
    occupancy,
    tags: [...tags],
    overridden,
    calculatedRate: overridden ? calculatedRate : undefined,
    overrideReason: overridden ? override?.reason : undefined,
    minStay,
    rulesDisabled,
  };
}

function traceOf(
  rule: PricingRule,
  from: number,
  to: number,
  currency: string,
): AppliedRule {
  return {
    ruleId: rule.id,
    name: rule.name,
    type: rule.type,
    priority: rule.priority,
    mode: rule.calculationMode,
    adjustment: rule.adjustment,
    from: money(from),
    to: money(to),
    amount: money(to - from),
    label: describeAdjustment(rule.name, rule.adjustment, rule.calculationMode, currency),
  };
}

function sanitize(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return money(value);
}

function clamp01(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * The single tag a legacy caller wants for a night.
 *
 * `DayRate.season` has been `"peak" | "weekend" | "low"` since before the rule
 * engine existed and the order summary and revenue manager both read it. This
 * keeps that contract by projecting the engine's richer tag set onto it.
 */
export function legacySeasonTag(rate: DailyRate): "peak" | "weekend" | "low" | undefined {
  if (rate.tags.includes("holiday")) return "peak";
  if (rate.tags.includes("season")) {
    return rate.effectiveRate >= rate.baseRate ? "peak" : "low";
  }
  if (rate.tags.includes("demand") && rate.effectiveRate > rate.baseRate) return "peak";
  if (rate.tags.includes("weekend") && rate.effectiveRate > rate.baseRate) return "weekend";
  if (rate.effectiveRate < rate.baseRate) return "low";
  return undefined;
}

/**
 * A traveller-safe explanation for why a night costs what it does.
 *
 * Internal machinery — rule ids, priorities, calculation modes — never reaches
 * this string. It says "Peak season +30%", not "prl_9012 base_relative".
 */
export function explainDailyRate(rate: DailyRate): string[] {
  const out: string[] = [];
  for (const entry of rate.applied) {
    if (entry.type === "manual_override") continue;
    if (entry.amount === 0) continue;
    out.push(entry.label);
  }
  return out;
}
