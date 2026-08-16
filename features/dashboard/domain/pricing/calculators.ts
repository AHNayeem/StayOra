/**
 * Stay-level pricing — nights into a bookable room total.
 *
 * `engine.ts` prices one night at a time and knows nothing about the shape of
 * the booking. The rules that *do* need the whole booking live here:
 *
 *   rate plan       the commercial package's own factor
 *   booking window  how far ahead the traveller is booking
 *   length of stay  how many nights
 *   guest count     people beyond the occupancy the rate covers
 *   discount        a blanket reduction on the room subtotal
 *
 * ## Order, and what a percentage is measured against
 *
 *   1. `nightlySubtotal` = Σ effective nightly rate × units.
 *   2. The rate plan's factor is applied to that (a plan that pins an absolute
 *      contracted rate has already replaced the base rate upstream, so its
 *      factor is 1 and this step is a no-op).
 *   3. Booking-window, length-of-stay and guest rules run in the same priority
 *      order the daily engine uses, with the same `base_relative` /
 *      `sequential` / `override` semantics and the same non-stacking rule. The
 *      "base" a `base_relative` percentage is measured against is the
 *      post-rate-plan subtotal, so −10% length-of-stay and −5% early-bird give
 *      −15%, not −14.5%.
 *   4. Discount rules run last, against the adjusted subtotal, and are reported
 *      separately so the traveller sees them as savings rather than as a lower
 *      room rate.
 *
 * ## What a fixed amount means
 *
 * A `fixed` adjustment is currency, and its multiplicity depends on what the
 * rule is about — stated once here rather than guessed at each call site:
 *
 *   guest           per extra guest, per night   (an extra bed is nightly)
 *   everything else per booking                  (a flat fee or reduction)
 *
 * Taxes, service fees, insurance and platform discounts are **not** here. They
 * belong to `money.ts`, which prices the booking as a whole; this module stops
 * at the room subtotal, which is exactly the `base` that `priceBooking` takes.
 */

import { money } from "../money";
import type {
  AppliedRule,
  BookingPriceCalculation,
  DailyRate,
  PriceBreakdownLine,
  PricingConfiguration,
  PricingRule,
  StayPriceContext,
} from "./types";
import { FALLBACK_CONFIG, explainDailyRate } from "./engine";
import {
  applyAdjustment,
  conditionMatches,
  daysBetween,
  describeAdjustment,
  isRuleEligible,
  isStayRule,
  orderRules,
  scopeMatches,
} from "./rules";

/** Guests one unit's rate covers before guest rules bite. */
export function includedGuestsFor(maxOccupancy: number, units: number): number {
  // Two people to a room is the near-universal inclusion; a single-occupancy
  // unit (a dorm bed, a visa application) includes exactly its own occupancy.
  return Math.max(1, Math.min(2, Math.max(1, maxOccupancy))) * Math.max(1, units);
}

/**
 * Price a stay.
 *
 * Every figure it returns is derived; nothing is stored and nothing is read
 * from the store, so a preview in the rule form and the number the traveller is
 * charged come from the same call with the same guarantees.
 */
export function calculateStayPrice(context: StayPriceContext): BookingPriceCalculation {
  const config: PricingConfiguration = context.config ?? FALLBACK_CONFIG;
  const currency = context.ratePlan.currency || config.currency || "USD";
  const units = Math.max(1, Math.floor(context.units) || 1);
  const guests = Math.max(1, Math.floor(context.guests) || 1);
  const nights = context.nights;
  const nightCount = nights.length;
  const warnings: string[] = [];

  const baseSubtotal = money(nights.reduce((sum, n) => sum + n.baseRate, 0) * units);
  const nightlySubtotal = money(nights.reduce((sum, n) => sum + n.effectiveRate, 0) * units);

  // --- 2. rate plan --------------------------------------------------------
  // A plan that pins a contracted rate has already replaced the base rate, so
  // applying its factor as well would charge the contract twice.
  const planFactor =
    context.ratePlan.baseRate !== undefined
      ? 1
      : Number.isFinite(context.ratePlan.priceFactor) && context.ratePlan.priceFactor > 0
        ? context.ratePlan.priceFactor
        : 1;
  const afterPlan = money(nightlySubtotal * planFactor);
  const ratePlanAdjustment = money(afterPlan - nightlySubtotal);

  const leadTimeDays = daysBetween(context.bookingDate, context.checkIn);
  if (leadTimeDays < 0) {
    warnings.push("The check-in date is in the past for this quote.");
  }

  const conditionTarget = {
    date: context.checkIn,
    leadTimeDays: Math.max(0, leadTimeDays),
    nights: nightCount,
    guests,
    occupancy: averageOccupancy(nights),
  };

  const eligible = (context.rules ?? []).filter(
    (rule) =>
      isStayRule(rule) &&
      isRuleEligible(rule, config) &&
      scopeMatches(rule, {
        propertyId: context.propertyId,
        roomTypeId: context.roomTypeId,
        ratePlanId: context.ratePlan.id,
        vertical: context.vertical,
      }) &&
      conditionMatches(rule.condition, conditionTarget),
  );

  const extraGuests = Math.max(0, guests - context.includedGuests);
  const adjusters = orderRules(eligible.filter((rule) => rule.type !== "discount"));
  const discounters = orderRules(eligible.filter((rule) => rule.type === "discount"));

  // --- 3. stay adjustments -------------------------------------------------
  const stayAdjustments: AppliedRule[] = [];
  let running = afterPlan;
  let closed: PricingRule | null = null;

  for (const rule of adjusters) {
    if (closed) continue;
    if (rule.type === "guest" && extraGuests === 0) continue;
    const adjustment = scaleAdjustment(rule, {
      nightCount,
      units,
      extraGuests,
    });
    const next = applyAdjustment(adjustment, rule.calculationMode, afterPlan, running);
    if (next !== running) {
      stayAdjustments.push({
        ruleId: rule.id,
        name: rule.name,
        type: rule.type,
        priority: rule.priority,
        mode: rule.calculationMode,
        adjustment,
        from: money(running),
        to: money(next),
        amount: money(next - running),
        label: labelFor(rule, adjustment, extraGuests, currency),
      });
      running = next;
    }
    if (!rule.stackable || rule.calculationMode === "override") closed = rule;
  }

  const adjustedSubtotal = money(Math.max(0, running));

  // --- 4. discounts --------------------------------------------------------
  const discounts: AppliedRule[] = [];
  let afterDiscounts = adjustedSubtotal;
  let discountClosed: PricingRule | null = null;
  for (const rule of discounters) {
    if (discountClosed) continue;
    const adjustment = scaleAdjustment(rule, { nightCount, units, extraGuests });
    // A discount is expressed as a reduction whatever sign the merchant typed:
    // "10% off" and "−10%" must not mean opposite things.
    const signed = {
      ...adjustment,
      value: adjustment.type === "set" ? adjustment.value : -Math.abs(adjustment.value),
    };
    const next = applyAdjustment(
      signed,
      rule.calculationMode,
      adjustedSubtotal,
      afterDiscounts,
    );
    if (next !== afterDiscounts) {
      discounts.push({
        ruleId: rule.id,
        name: rule.name,
        type: rule.type,
        priority: rule.priority,
        mode: rule.calculationMode,
        adjustment: signed,
        from: money(afterDiscounts),
        to: money(next),
        amount: money(next - afterDiscounts),
        label: describeAdjustment(rule.name, signed, rule.calculationMode, currency),
      });
      afterDiscounts = next;
    }
    if (!rule.stackable) discountClosed = rule;
  }

  const discountTotal = money(Math.max(0, adjustedSubtotal - afterDiscounts));
  const roomSubtotal = money(Math.max(0, afterDiscounts));

  if (nightCount > 0 && roomSubtotal === 0 && baseSubtotal > 0) {
    warnings.push("The configured rules reduce this stay to nothing — check the discounts.");
  }
  if (nights.some((n) => n.rulesDisabled)) {
    warnings.push("Dynamic pricing is switched off for this property; base rates apply.");
  }

  const explanations = dedupe(nights.flatMap(explainDailyRate));

  return {
    currency,
    ratePlanId: context.ratePlan.id,
    ratePlanName: context.ratePlan.name,
    roomTypeId: context.roomTypeId,
    units,
    guests,
    bookingDate: context.bookingDate,
    checkIn: context.checkIn,
    checkOut: context.checkOut,
    nightCount,
    nights,
    baseSubtotal,
    nightlySubtotal,
    ratePlanAdjustment,
    stayAdjustments,
    discounts,
    discountTotal,
    roomSubtotal,
    averageNightly: nightCount > 0 ? money(roomSubtotal / nightCount / units) : 0,
    explanations,
    warnings,
    valid: nightCount > 0 && Number.isFinite(roomSubtotal),
  };
}

/**
 * Turn a fixed amount into the total it actually represents. Percentages and
 * multipliers are dimensionless and pass through untouched.
 */
function scaleAdjustment(
  rule: PricingRule,
  scale: { nightCount: number; units: number; extraGuests: number },
) {
  if (rule.adjustment.type !== "fixed") return rule.adjustment;
  if (rule.type === "guest") {
    return {
      ...rule.adjustment,
      value: rule.adjustment.value * scale.extraGuests * Math.max(1, scale.nightCount),
    };
  }
  return rule.adjustment;
}

function labelFor(
  rule: PricingRule,
  adjustment: PricingRule["adjustment"],
  extraGuests: number,
  currency: string,
): string {
  if (rule.type === "guest" && extraGuests > 0 && rule.adjustment.type === "fixed") {
    return `${rule.name} — ${extraGuests} extra ${extraGuests === 1 ? "guest" : "guests"}`;
  }
  return describeAdjustment(rule.name, adjustment, rule.calculationMode, currency);
}

function averageOccupancy(nights: DailyRate[]): number {
  if (nights.length === 0) return 0;
  return nights.reduce((sum, n) => sum + n.occupancy, 0) / nights.length;
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}

// ---------------------------------------------------------------------------
// Breakdown
// ---------------------------------------------------------------------------

/**
 * The room half of the traveller's bill, as display lines.
 *
 * Taxes, fees and platform discounts are appended by the checkout from
 * `BookingMoney` — this function deliberately stops where the room stops, so
 * there is exactly one place each number is produced.
 */
export function toPriceBreakdown(
  calculation: BookingPriceCalculation,
  options: { nightly?: boolean } = {},
): PriceBreakdownLine[] {
  const lines: PriceBreakdownLine[] = [];
  const { units, nightCount } = calculation;

  if (options.nightly !== false) {
    for (const night of calculation.nights) {
      const reasons = explainDailyRate(night);
      lines.push({
        key: `night:${night.date}`,
        label: night.date,
        detail: night.overridden
          ? night.overrideReason || "Rate set by the property"
          : reasons.join(" · ") || undefined,
        amount: money(night.effectiveRate * units),
        kind: "charge",
      });
    }
  }

  lines.push({
    key: "nightly-subtotal",
    label: `${nightCount} ${nightCount === 1 ? "night" : "nights"} × ${units} ${
      units === 1 ? "unit" : "units"
    }`,
    amount: calculation.nightlySubtotal,
    kind: "charge",
  });

  if (calculation.ratePlanAdjustment !== 0) {
    lines.push({
      key: "rate-plan",
      label: calculation.ratePlanName,
      amount: calculation.ratePlanAdjustment,
      kind: calculation.ratePlanAdjustment < 0 ? "discount" : "charge",
    });
  }

  for (const adjustment of calculation.stayAdjustments) {
    lines.push({
      key: `stay:${adjustment.ruleId}`,
      label: adjustment.label,
      amount: adjustment.amount,
      kind: adjustment.amount < 0 ? "discount" : "charge",
    });
  }

  for (const discount of calculation.discounts) {
    lines.push({
      key: `discount:${discount.ruleId}`,
      label: discount.label,
      amount: discount.amount,
      kind: "discount",
    });
  }

  lines.push({
    key: "room-subtotal",
    label: "Room subtotal",
    amount: calculation.roomSubtotal,
    kind: "total",
  });

  return lines;
}
