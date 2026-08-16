/**
 * Pricing engine tests — `bun run test:pricing`.
 *
 * Two halves, deliberately separated:
 *
 *   1. **The engine, in isolation.** `resolveDailyRate` and
 *      `calculateStayPrice` are pure functions of their inputs, so these tests
 *      build their own rules and assert exact currency amounts. No store, no
 *      seed, no clock — a failure here is a arithmetic or ordering bug and
 *      nothing else.
 *   2. **The integration.** A handful of checks through `quoteStay`, which is
 *      the path the listing page and checkout actually take, to prove the
 *      engine is wired in rather than merely correct in a vacuum.
 *
 * The assertions are about *numbers*, not rendering: every one of them would
 * catch a real mispricing.
 */

import {
  FALLBACK_CONFIG,
  calculateStayPrice,
  conditionMatches,
  daysBetween,
  includedGuestsFor,
  isValidISODate,
  isoRange,
  orderRules,
  resolveDailyRate,
  roundRate,
  toPriceBreakdown,
  validateRule,
  weekdayOf,
  type DailyRate,
  type PricingConfiguration,
  type PricingRule,
  type PricingRuleInput,
  type RatePlan,
} from "@/features/dashboard/domain/pricing";
import {
  getRoomTypes,
  quoteStay,
  ratePlansFor,
  setPriceOverride,
  removePriceOverride,
  type PropertyRef,
} from "@/features/dashboard/domain";
import { HOTELS } from "@/constants/listings";
import { toPropertyRef } from "@/features/booking/property";

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail = ""): void {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function equal(name: string, actual: unknown, expected: unknown): void {
  check(name, Object.is(actual, expected), `expected ${String(expected)}, got ${String(actual)}`);
}

function section(title: string): void {
  console.log(`\n${title}`);
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CONFIG: PricingConfiguration = {
  ...FALLBACK_CONFIG,
  id: "pcfg_test",
  weekendDays: [5, 6],
  minRateFactor: 0.4,
  maxRateFactor: 4,
  // Cents, so the tests assert the engine's arithmetic rather than its rounding.
  roundingIncrement: 0,
};

let ruleSeq = 0;

function rule(input: Partial<PricingRuleInput> & Pick<PricingRuleInput, "type">): PricingRule {
  ruleSeq += 1;
  return {
    id: `test_rule_${ruleSeq}`,
    name: input.name ?? `Rule ${ruleSeq}`,
    description: "",
    type: input.type,
    scope: input.scope ?? {
      propertyIds: [],
      roomTypeIds: [],
      ratePlanIds: [],
      verticals: [],
    },
    condition: input.condition ?? {},
    adjustment: input.adjustment ?? { type: "percent", value: 10 },
    priority: input.priority ?? 50,
    stackable: input.stackable ?? true,
    calculationMode: input.calculationMode ?? "base_relative",
    status: input.status ?? "active",
    minStay: input.minStay ?? 0,
    maxStay: input.maxStay ?? 0,
    closedToArrival: false,
    closedToDeparture: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    updatedBy: "test",
  };
}

/** Resolve one night with an explicit rule set. */
function night(
  date: string,
  base: number,
  rules: PricingRule[],
  extra: Partial<Parameters<typeof resolveDailyRate>[0]> = {},
): DailyRate {
  return resolveDailyRate({
    date,
    baseRate: base,
    propertyId: "prop_1",
    roomTypeId: "room_1",
    ratePlanId: "standard",
    vertical: "hotels",
    occupancy: 0,
    config: CONFIG,
    rules,
    ...extra,
  });
}

const PLAN: RatePlan = {
  id: "standard",
  name: "Standard rate",
  description: "",
  priceFactor: 1,
  currency: "USD",
  cancellationPolicyId: "moderate",
  mealPlan: "none",
  includesBreakfast: false,
  refundable: true,
  minStay: 1,
  maxStay: 30,
  closedToArrival: [],
  closedToDeparture: [],
  minAdvanceDays: 0,
  maxAdvanceDays: 0,
  status: "active",
  verticals: [],
  propertyIds: [],
  roomTypeIds: [],
  inclusions: [],
  builtIn: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  updatedBy: "test",
};

/** A flat stay of `count` nights at `base`, with no daily rules applied. */
function flatNights(start: string, count: number, base: number): DailyRate[] {
  return isoRange(start, count).map((date) => night(date, base, []));
}

function stay(
  nights: DailyRate[],
  options: Partial<Parameters<typeof calculateStayPrice>[0]> = {},
) {
  const checkIn = nights[0]?.date ?? "2026-09-10";
  const checkOut = isoRange(checkIn, nights.length + 1).at(-1) ?? checkIn;
  return calculateStayPrice({
    nights,
    ratePlan: PLAN,
    roomTypeId: "room_1",
    propertyId: "prop_1",
    vertical: "hotels",
    units: 1,
    guests: 2,
    includedGuests: 2,
    bookingDate: "2026-09-01",
    checkIn,
    checkOut,
    config: CONFIG,
    ...options,
  });
}

// ---------------------------------------------------------------------------
// 1. Base rate
// ---------------------------------------------------------------------------

section("Base rate");
{
  // 2026-09-10 is a Thursday, so no weekend rule can confuse the figure.
  const day = night("2026-09-10", 5000, []);
  equal("no rules leaves the base rate alone", day.effectiveRate, 5000);
  equal("the trace is empty", day.applied.length, 0);
  check("and the night is tagged normal", day.tags.includes("normal"));
  equal("weekday is derived correctly", weekdayOf("2026-09-10"), 4);
}

// ---------------------------------------------------------------------------
// 2. Weekend pricing
// ---------------------------------------------------------------------------

section("Weekend pricing");
{
  const weekend = rule({
    type: "weekend",
    name: "Weekend",
    adjustment: { type: "percent", value: 20 },
    priority: 20,
  });
  // 2026-09-11 is a Friday — a weekend day in this configuration.
  const friday = night("2026-09-11", 5000, [weekend]);
  equal("Friday takes the weekend uplift", friday.effectiveRate, 6000);
  check("and is tagged as a weekend", friday.tags.includes("weekend"));

  const thursday = night("2026-09-10", 5000, [weekend]);
  equal("Thursday does not", thursday.effectiveRate, 5000);

  // The weekend is configuration, not an assumption about Saturday/Sunday.
  const sundayMarket: PricingConfiguration = { ...CONFIG, weekendDays: [0, 6] };
  const sunday = resolveDailyRate({
    date: "2026-09-13",
    baseRate: 5000,
    propertyId: "prop_1",
    roomTypeId: "room_1",
    ratePlanId: "standard",
    vertical: "hotels",
    occupancy: 0,
    config: sundayMarket,
    rules: [weekend],
  });
  equal("a Sunday-weekend market prices Sunday up", sunday.effectiveRate, 6000);
  const friInSundayMarket = resolveDailyRate({
    date: "2026-09-11",
    baseRate: 5000,
    propertyId: "prop_1",
    roomTypeId: "room_1",
    ratePlanId: "standard",
    vertical: "hotels",
    occupancy: 0,
    config: sundayMarket,
    rules: [weekend],
  });
  equal("…and leaves Friday alone", friInSundayMarket.effectiveRate, 5000);
}

// ---------------------------------------------------------------------------
// 3. Season pricing
// ---------------------------------------------------------------------------

section("Season pricing");
{
  const peak = rule({
    type: "season",
    name: "Peak",
    condition: { dateFrom: "2026-12-15", dateTo: "2027-01-10" },
    adjustment: { type: "percent", value: 30 },
    priority: 50,
  });
  equal("inside the window", night("2026-12-20", 5000, [peak]).effectiveRate, 6500);
  equal("the first day is inclusive", night("2026-12-15", 5000, [peak]).effectiveRate, 6500);
  equal("the last day is inclusive", night("2027-01-10", 5000, [peak]).effectiveRate, 6500);
  equal("the day before is not", night("2026-12-14", 5000, [peak]).effectiveRate, 5000);
  equal("the day after is not", night("2027-01-11", 5000, [peak]).effectiveRate, 5000);
}

// ---------------------------------------------------------------------------
// 4. Holiday pricing
// ---------------------------------------------------------------------------

section("Holiday pricing");
{
  const eid = rule({
    type: "holiday",
    name: "Eid",
    condition: { dateFrom: "2026-03-20", dateTo: "2026-03-23" },
    adjustment: { type: "percent", value: 50 },
    priority: 100,
    stackable: false,
  });
  equal("a holiday raises the rate", night("2026-03-21", 5000, [eid]).effectiveRate, 7500);
  check("and tags the night", night("2026-03-21", 5000, [eid]).tags.includes("holiday"));

  const fixed = rule({
    type: "holiday",
    name: "New Year",
    condition: { dateFrom: "2026-12-31", dateTo: "2026-12-31" },
    adjustment: { type: "set", value: 12_000 },
    calculationMode: "override",
    priority: 120,
    stackable: false,
  });
  equal(
    "an override-mode holiday sets the rate outright",
    night("2026-12-31", 5000, [fixed]).effectiveRate,
    12_000,
  );
}

// ---------------------------------------------------------------------------
// 5. Weekend + season
// ---------------------------------------------------------------------------

section("Weekend + season");
{
  const weekend = rule({
    type: "weekend",
    name: "Weekend",
    adjustment: { type: "percent", value: 20 },
    priority: 20,
  });
  const peak = rule({
    type: "season",
    name: "Peak",
    condition: { dateFrom: "2026-09-01", dateTo: "2026-09-30" },
    adjustment: { type: "percent", value: 30 },
    priority: 50,
  });

  // Both are base-relative, so they add rather than compound: +20% +30% = +50%.
  const friday = night("2026-09-11", 5000, [weekend, peak]);
  equal("base-relative rules add", friday.effectiveRate, 7500);
  equal("both fired", friday.applied.length, 2);
  equal("the season ran first (higher priority)", friday.applied[0].name, "Peak");

  // Sequential is the opt-in that compounds: 5000 × 1.3 × 1.2 = 7800.
  const compounding = night("2026-09-11", 5000, [
    { ...peak, calculationMode: "sequential" },
    { ...weekend, calculationMode: "sequential" },
  ]);
  equal("sequential rules compound", compounding.effectiveRate, 7800);
}

// ---------------------------------------------------------------------------
// 6. Holiday + weekend
// ---------------------------------------------------------------------------

section("Holiday + weekend");
{
  const weekend = rule({
    type: "weekend",
    name: "Weekend",
    adjustment: { type: "percent", value: 20 },
    priority: 20,
  });
  // 2026-12-25 is a Friday — a weekend day here, and Christmas.
  const christmas = rule({
    type: "holiday",
    name: "Christmas",
    condition: { dateFrom: "2026-12-24", dateTo: "2026-12-26" },
    adjustment: { type: "percent", value: 40 },
    priority: 100,
    stackable: false,
  });

  const day = night("2026-12-25", 5000, [weekend, christmas]);
  equal("the holiday wins outright", day.effectiveRate, 7000);
  equal("only one rule applied", day.applied.length, 1);
  equal("the weekend was skipped", day.skipped.length, 1);
  check(
    "…with the reason recorded",
    day.skipped[0].reason.includes("does not stack"),
    day.skipped[0]?.reason,
  );
}

// ---------------------------------------------------------------------------
// 7. Priority conflict
// ---------------------------------------------------------------------------

section("Rule priority & conflict resolution");
{
  const low = rule({ type: "season", name: "Low", priority: 10 });
  const high = rule({ type: "holiday", name: "High", priority: 90 });
  const mid = rule({ type: "demand", name: "Mid", priority: 50 });
  const ordered = orderRules([low, high, mid]);
  equal("highest priority first", ordered[0].name, "High");
  equal("then the middle", ordered[1].name, "Mid");
  equal("then the lowest", ordered[2].name, "Low");

  // Equal priority falls back to a fixed type rank, never array order.
  const sameA = rule({ type: "weekend", name: "W", priority: 50 });
  const sameB = rule({ type: "holiday", name: "H", priority: 50 });
  equal("ties break by type rank", orderRules([sameA, sameB])[0].name, "H");
  equal("…deterministically, whatever the input order", orderRules([sameB, sameA])[0].name, "H");

  // An override-mode rule at the top stops everything, stackable or not.
  const override = rule({
    type: "holiday",
    name: "Fixed",
    adjustment: { type: "set", value: 9000 },
    calculationMode: "override",
    priority: 200,
  });
  const other = rule({
    type: "season",
    name: "Season",
    adjustment: { type: "percent", value: 30 },
    priority: 50,
  });
  const day = night("2026-09-10", 5000, [override, other]);
  equal("an override replaces the rate", day.effectiveRate, 9000);
  equal("and skips everything below it", day.skipped.length, 1);

  // Guard rails: no rule may take a rate outside the configured band.
  const runaway = rule({
    type: "season",
    name: "Runaway",
    adjustment: { type: "percent", value: 900 },
    priority: 50,
  });
  equal(
    "the ceiling clamps a runaway rule",
    night("2026-09-10", 5000, [runaway]).effectiveRate,
    20_000,
  );
  const deepCut = rule({
    type: "season",
    name: "Deep cut",
    adjustment: { type: "percent", value: -95 },
    priority: 50,
  });
  equal(
    "the floor catches a runaway discount",
    night("2026-09-10", 5000, [deepCut]).effectiveRate,
    2000,
  );
}

// ---------------------------------------------------------------------------
// 8. Manual override
// ---------------------------------------------------------------------------

section("Manual override");
{
  const peak = rule({
    type: "season",
    name: "Peak",
    condition: { dateFrom: "2026-09-01", dateTo: "2026-09-30" },
    adjustment: { type: "percent", value: 30 },
  });
  const day = night("2026-09-10", 5000, [peak], {
    override: { price: 7500, reason: "Group booking" },
  });
  equal("the pinned rate wins", day.effectiveRate, 7500);
  check("the night is marked as overridden", day.overridden);
  equal("what the rules wanted is kept", day.calculatedRate, 6500);
  equal("with the reason", day.overrideReason, "Group booking");
  check("and it is tagged", day.tags.includes("override"));
  equal(
    "the override is the last entry in the trace",
    day.applied[day.applied.length - 1].type,
    "manual_override",
  );
  // The season still ran — the trace shows what it would have charged.
  equal("the rule's own contribution is still visible", day.applied[0].to, 6500);
}

// ---------------------------------------------------------------------------
// 9. Booking window
// ---------------------------------------------------------------------------

section("Booking-window pricing");
{
  const early = rule({
    type: "booking_window",
    name: "60 days",
    condition: { leadTimeMinDays: 60 },
    adjustment: { type: "percent", value: -15 },
    priority: 30,
  });
  const lastMinute = rule({
    type: "booking_window",
    name: "Last minute",
    condition: { leadTimeMaxDays: 6 },
    adjustment: { type: "percent", value: 15 },
    priority: 30,
  });
  const rules = [early, lastMinute];

  const twoNights = flatNights("2026-12-01", 2, 5000);
  const wayAhead = stay(twoNights, {
    rules,
    bookingDate: "2026-06-01", // 183 days out
    checkIn: "2026-12-01",
    checkOut: "2026-12-03",
  });
  equal("booking six months out discounts 15%", wayAhead.roomSubtotal, 8500);

  const tomorrow = stay(twoNights, {
    rules,
    bookingDate: "2026-11-28", // 3 days out
    checkIn: "2026-12-01",
    checkOut: "2026-12-03",
  });
  equal("booking three days out costs 15% more", tomorrow.roomSubtotal, 11_500);

  const middle = stay(twoNights, {
    rules,
    bookingDate: "2026-11-11", // 20 days out — neither band
    checkIn: "2026-12-01",
    checkOut: "2026-12-03",
  });
  equal("the gap between the bands is the plain rate", middle.roomSubtotal, 10_000);
  equal("lead time is whole days", daysBetween("2026-11-11", "2026-12-01"), 20);
}

// ---------------------------------------------------------------------------
// 10. Length of stay
// ---------------------------------------------------------------------------

section("Length-of-stay pricing");
{
  const rules = [
    rule({
      type: "length_of_stay",
      name: "3–4 nights",
      condition: { nightsMin: 3, nightsMax: 4 },
      adjustment: { type: "percent", value: -5 },
      priority: 25,
    }),
    rule({
      type: "length_of_stay",
      name: "5–6 nights",
      condition: { nightsMin: 5, nightsMax: 6 },
      adjustment: { type: "percent", value: -10 },
      priority: 25,
    }),
    rule({
      type: "length_of_stay",
      name: "7+ nights",
      condition: { nightsMin: 7 },
      adjustment: { type: "percent", value: -15 },
      priority: 25,
    }),
  ];

  const of = (count: number) =>
    stay(flatNights("2026-09-07", count, 1000), {
      rules,
      checkIn: "2026-09-07",
      checkOut: isoRange("2026-09-07", count + 1).at(-1)!,
    }).roomSubtotal;

  equal("two nights are undiscounted", of(2), 2000);
  equal("three nights take 5% off", of(3), 2850);
  equal("five nights take 10% off", of(5), 4500);
  equal("seven nights take 15% off", of(7), 5950);
  equal("only one band applies", stay(flatNights("2026-09-07", 7, 1000), { rules }).stayAdjustments.length, 1);
}

// ---------------------------------------------------------------------------
// 11. Occupancy / demand
// ---------------------------------------------------------------------------

section("Demand pricing");
{
  const bands = [
    rule({
      type: "demand",
      name: "51–80",
      condition: { occupancyMin: 0.5, occupancyMax: 0.8 },
      adjustment: { type: "percent", value: 10 },
      priority: 40,
    }),
    rule({
      type: "demand",
      name: "81–95",
      condition: { occupancyMin: 0.8, occupancyMax: 0.95 },
      adjustment: { type: "percent", value: 20 },
      priority: 40,
    }),
    rule({
      type: "demand",
      name: "96–100",
      condition: { occupancyMin: 0.95, occupancyMax: 1.01 },
      adjustment: { type: "percent", value: 35 },
      priority: 40,
    }),
  ];
  const at = (occupancy: number) =>
    night("2026-09-10", 5000, bands, { occupancy }).effectiveRate;

  equal("an empty night is at base", at(0.1), 5000);
  equal("half full is at base (the band starts at 0.5)", at(0.49), 5000);
  equal("60% full adds 10%", at(0.6), 5500);
  equal("90% full adds 20%", at(0.9), 6000);
  equal("sold out adds 35%", at(1), 6750);
  equal("bands don't double-apply at the boundary", at(0.8), 6000);
  equal(
    "exactly one demand rule fires",
    night("2026-09-10", 5000, bands, { occupancy: 0.85 }).applied.length,
    1,
  );

  // Turning demand pricing off is a configuration switch, not a rule edit.
  const off = resolveDailyRate({
    date: "2026-09-10",
    baseRate: 5000,
    propertyId: "prop_1",
    roomTypeId: "room_1",
    ratePlanId: "standard",
    vertical: "hotels",
    occupancy: 0.9,
    config: { ...CONFIG, demandPricingEnabled: false },
    rules: bands,
  });
  equal("switching demand pricing off silences the band", off.effectiveRate, 5000);
}

// ---------------------------------------------------------------------------
// 12. Guest count
// ---------------------------------------------------------------------------

section("Guest-based pricing");
{
  const extraGuest = rule({
    type: "guest",
    name: "Extra guest",
    condition: { guestsMin: 3 },
    adjustment: { type: "fixed", value: 500 },
    priority: 15,
  });
  const nights = flatNights("2026-09-07", 2, 5000);
  const at = (guests: number) =>
    stay(nights, { rules: [extraGuest], guests, includedGuests: 2 }).roomSubtotal;

  equal("two guests are included", at(2), 10_000);
  equal("a third guest is 500 a night", at(3), 11_000);
  equal("a fourth is another 500 a night", at(4), 12_000);

  // Not every property does this, and the switch says so.
  const off = calculateStayPrice({
    nights,
    ratePlan: PLAN,
    roomTypeId: "room_1",
    propertyId: "prop_1",
    vertical: "hotels",
    units: 1,
    guests: 4,
    includedGuests: 2,
    bookingDate: "2026-09-01",
    checkIn: "2026-09-07",
    checkOut: "2026-09-09",
    config: { ...CONFIG, guestPricingEnabled: false },
    rules: [extraGuest],
  });
  equal("guest pricing can be switched off per property", off.roomSubtotal, 10_000);

  equal("a double room includes two", includedGuestsFor(2, 1), 2);
  equal("a dorm bed includes one", includedGuestsFor(1, 1), 1);
  equal("a suite still includes two per unit", includedGuestsFor(4, 1), 2);
  equal("two rooms include four", includedGuestsFor(2, 2), 4);
}

// ---------------------------------------------------------------------------
// 13. Discounts
// ---------------------------------------------------------------------------

section("Discounts");
{
  const saver = rule({
    type: "discount",
    name: "Extended stay",
    condition: { nightsMin: 5 },
    adjustment: { type: "percent", value: 10 },
    priority: 10,
  });
  const result = stay(flatNights("2026-09-07", 5, 1000), { rules: [saver] });
  equal("a 10% discount comes off the subtotal", result.roomSubtotal, 4500);
  equal("and is reported as a saving", result.discountTotal, 500);
  equal("separately from the adjustments", result.stayAdjustments.length, 0);
  equal("one discount line", result.discounts.length, 1);
  check("with a negative amount", result.discounts[0].amount < 0);

  // A merchant typing "10" and a merchant typing "−10" mean the same thing.
  const negative = stay(flatNights("2026-09-07", 5, 1000), {
    rules: [{ ...saver, adjustment: { type: "percent", value: -10 } }],
  });
  equal("the sign of a discount is not load-bearing", negative.roomSubtotal, 4500);

  const paused = stay(flatNights("2026-09-07", 5, 1000), {
    rules: [{ ...saver, status: "paused" }],
  });
  equal("a paused discount does nothing", paused.roomSubtotal, 5000);
}

// ---------------------------------------------------------------------------
// 14. Multi-night booking, end to end
// ---------------------------------------------------------------------------

section("A multi-night stay, end to end");
{
  const weekend = rule({
    type: "weekend",
    name: "Weekend",
    adjustment: { type: "percent", value: 20 },
    priority: 20,
  });
  const peak = rule({
    type: "season",
    name: "Peak season",
    condition: { dateFrom: "2026-12-15", dateTo: "2027-01-10" },
    adjustment: { type: "percent", value: 30 },
    priority: 50,
  });
  const rules = [weekend, peak];

  // Dec 18 (Fri), 19 (Sat), 20 (Sun) 2026 — two weekend nights inside peak.
  const nights = isoRange("2026-12-18", 3).map((date) => night(date, 5000, rules));
  equal("Friday: peak + weekend", nights[0].effectiveRate, 7500);
  equal("Saturday: peak + weekend", nights[1].effectiveRate, 7500);
  equal("Sunday: peak only", nights[2].effectiveRate, 6500);

  const result = calculateStayPrice({
    nights,
    ratePlan: PLAN,
    roomTypeId: "room_1",
    propertyId: "prop_1",
    vertical: "hotels",
    units: 1,
    guests: 2,
    includedGuests: 2,
    bookingDate: "2026-12-10",
    checkIn: "2026-12-18",
    checkOut: "2026-12-21",
    config: CONFIG,
    rules,
  });
  equal("the nights add up", result.roomSubtotal, 21_500);
  equal("the base would have been", result.baseSubtotal, 15_000);
  equal("three nights", result.nightCount, 3);
  // Rounded to cents, like every other stored figure in the domain.
  equal("average nightly", result.averageNightly, 7166.67);
  check("and the reasons are collected", result.explanations.length === 2);

  // Two rooms is exactly twice one room.
  const two = calculateStayPrice({
    nights,
    ratePlan: PLAN,
    roomTypeId: "room_1",
    propertyId: "prop_1",
    vertical: "hotels",
    units: 2,
    guests: 4,
    includedGuests: 4,
    bookingDate: "2026-12-10",
    checkIn: "2026-12-18",
    checkOut: "2026-12-21",
    config: CONFIG,
    rules,
  });
  equal("two units double the subtotal", two.roomSubtotal, 43_000);

  // The rate plan multiplies the whole stay, once.
  const breakfast = calculateStayPrice({
    nights,
    ratePlan: { ...PLAN, id: "breakfast", name: "Breakfast", priceFactor: 1.2 },
    roomTypeId: "room_1",
    propertyId: "prop_1",
    vertical: "hotels",
    units: 1,
    guests: 2,
    includedGuests: 2,
    bookingDate: "2026-12-10",
    checkIn: "2026-12-18",
    checkOut: "2026-12-21",
    config: CONFIG,
    rules,
  });
  equal("the rate-plan factor applies once", breakfast.roomSubtotal, 25_800);
  equal("and is reported on its own line", breakfast.ratePlanAdjustment, 4300);

  const lines = toPriceBreakdown(result);
  equal("the breakdown ends with the room subtotal", lines.at(-1)?.amount, 21_500);
  check(
    "…and lists every night",
    lines.filter((line) => line.key.startsWith("night:")).length === 3,
  );
}

// ---------------------------------------------------------------------------
// 15. Date boundaries and edge cases
// ---------------------------------------------------------------------------

section("Dates & boundaries");
{
  check("a leap day is a real date", isValidISODate("2028-02-29"));
  check("…but not in a common year", !isValidISODate("2027-02-29"));
  check("31 April is rejected", !isValidISODate("2026-04-31"));
  check("gibberish is rejected", !isValidISODate("not-a-date"));
  check("an empty string is rejected", !isValidISODate(""));

  equal("a range crosses a month boundary", isoRange("2026-01-30", 3)[2], "2026-02-01");
  equal("…a year boundary", isoRange("2026-12-30", 3)[2], "2027-01-01");
  equal("…and a leap day", isoRange("2028-02-28", 2)[1], "2028-02-29");
  equal("February 2028 has 29 days", daysBetween("2028-02-01", "2028-03-01"), 29);
  equal("February 2027 has 28", daysBetween("2027-02-01", "2027-03-01"), 28);

  // A season that straddles New Year still matches on both sides.
  const festive = rule({
    type: "season",
    name: "Festive",
    condition: { dateFrom: "2026-12-15", dateTo: "2027-01-10" },
    adjustment: { type: "percent", value: 30 },
  });
  equal("December side", night("2026-12-31", 5000, [festive]).effectiveRate, 6500);
  equal("January side", night("2027-01-02", 5000, [festive]).effectiveRate, 6500);

  // Same-day check-in and check-out: zero nights, zero charge, still valid maths.
  const zero = stay([], { checkIn: "2026-09-10", checkOut: "2026-09-10" });
  equal("a zero-night stay costs nothing", zero.roomSubtotal, 0);
  equal("…with no average to divide by", zero.averageNightly, 0);
  check("…and reports itself as unusable", !zero.valid);

  // An inverted range is caught before it can produce a negative total.
  equal("an inverted range is negative days", daysBetween("2026-09-12", "2026-09-10"), -2);
  const backwards = stay(flatNights("2026-09-10", 1, 5000), {
    bookingDate: "2026-09-20",
    checkIn: "2026-09-10",
    checkOut: "2026-09-11",
  });
  check(
    "a check-in before the booking date is flagged",
    backwards.warnings.some((w) => w.includes("in the past")),
  );
  equal("…and still prices sanely", backwards.roomSubtotal, 5000);
}

// ---------------------------------------------------------------------------
// 16. Invalid configuration — the engine must never produce nonsense
// ---------------------------------------------------------------------------

section("Invalid configuration");
{
  equal("a NaN base rate becomes zero", night("2026-09-10", NaN, []).effectiveRate, 0);
  equal("a negative base rate becomes zero", night("2026-09-10", -500, []).effectiveRate, 0);
  equal(
    "an Infinite base rate becomes zero",
    night("2026-09-10", Number.POSITIVE_INFINITY, []).effectiveRate,
    0,
  );

  const nanRule = rule({
    type: "season",
    name: "Broken",
    adjustment: { type: "percent", value: NaN },
  });
  equal("a NaN adjustment is inert", night("2026-09-10", 5000, [nanRule]).effectiveRate, 5000);

  const zeroMultiplier = rule({
    type: "season",
    name: "Zero",
    adjustment: { type: "multiplier", value: 0 },
  });
  equal(
    "a zero multiplier is treated as a misconfiguration",
    night("2026-09-10", 5000, [zeroMultiplier]).effectiveRate,
    5000,
  );

  const minus200 = rule({
    type: "season",
    name: "Minus 200%",
    adjustment: { type: "percent", value: -200 },
  });
  const floored = night("2026-09-10", 5000, [minus200]);
  check("a −200% rule cannot go negative", floored.effectiveRate >= 0);
  equal("…it lands on the floor", floored.effectiveRate, 2000);

  // A disabled rule and a disabled engine both mean "base rate".
  const paused = rule({ type: "season", name: "Paused", status: "paused" });
  equal("a paused rule is ignored", night("2026-09-10", 5000, [paused]).effectiveRate, 5000);

  const engineOff = resolveDailyRate({
    date: "2026-09-10",
    baseRate: 5000,
    propertyId: "prop_1",
    roomTypeId: "room_1",
    ratePlanId: "standard",
    vertical: "hotels",
    occupancy: 0,
    config: { ...CONFIG, enabled: false },
    rules: [rule({ type: "season", name: "Peak", adjustment: { type: "percent", value: 30 } })],
  });
  equal("dynamic pricing off means the base rate", engineOff.effectiveRate, 5000);
  check("…and says so", engineOff.rulesDisabled);

  // A missing configuration falls back to permissive defaults, not a crash.
  const noConfig = resolveDailyRate({
    date: "2026-09-10",
    baseRate: 5000,
    propertyId: "prop_1",
    roomTypeId: "room_1",
    ratePlanId: "standard",
    vertical: "hotels",
    occupancy: 0,
    rules: [],
  });
  equal("a missing configuration still prices", noConfig.effectiveRate, 5000);

  // An unparseable date matches nothing rather than matching everything.
  const anyDate = rule({ type: "season", name: "Any", condition: { dateFrom: "2026-01-01" } });
  equal("a bad date resolves to the base rate", night("nope", 5000, [anyDate]).effectiveRate, 5000);

  equal("rounding to the nearest 5", roundRate(103.2, 5), 105);
  equal("rounding to cents", roundRate(103.216, 0), 103.22);
  equal("rounding a NaN", roundRate(NaN, 1), 0);
}

// ---------------------------------------------------------------------------
// Conditions & validation
// ---------------------------------------------------------------------------

section("Conditions & validation");
{
  check(
    "an empty condition matches everything",
    conditionMatches({}, { date: "2026-09-10" }),
  );
  check(
    "an occupancy band fails closed when occupancy is unknown",
    !conditionMatches({ occupancyMin: 0.5 }, { date: "2026-09-10" }),
  );
  check(
    "a nights band fails closed when nights are unknown",
    !conditionMatches({ nightsMin: 3 }, {}),
  );

  const errorsOf = (input: Parameters<typeof validateRule>[0]) =>
    validateRule(input).filter((p) => p.severity === "error");

  equal(
    "an end date before the start is an error",
    errorsOf({
      name: "X",
      type: "season",
      condition: { dateFrom: "2026-09-10", dateTo: "2026-09-01" },
      adjustment: { type: "percent", value: 10 },
      priority: 50,
      minStay: 0,
      maxStay: 0,
    }).length,
    1,
  );
  check(
    "a season with no dates is an error",
    errorsOf({
      name: "X",
      type: "season",
      condition: {},
      adjustment: { type: "percent", value: 10 },
      priority: 50,
      minStay: 0,
      maxStay: 0,
    }).some((p) => p.field === "condition.dateFrom"),
  );
  check(
    "a −100% discount is an error",
    errorsOf({
      name: "X",
      type: "discount",
      condition: {},
      adjustment: { type: "percent", value: -100 },
      priority: 10,
      minStay: 0,
      maxStay: 0,
    }).length > 0,
  );
  check(
    "an unnamed rule is an error",
    errorsOf({
      name: "  ",
      type: "weekend",
      condition: {},
      adjustment: { type: "percent", value: 10 },
      priority: 20,
      minStay: 0,
      maxStay: 0,
    }).some((p) => p.field === "name"),
  );

  const overlapping = rule({
    type: "season",
    name: "Existing",
    condition: { dateFrom: "2026-06-01", dateTo: "2026-08-31" },
  });
  const warnings = validateRule(
    {
      name: "New",
      type: "season",
      condition: { dateFrom: "2026-07-01", dateTo: "2026-07-31" },
      adjustment: { type: "percent", value: 20 },
      priority: 50,
      minStay: 0,
      maxStay: 0,
    },
    [overlapping],
  ).filter((p) => p.severity === "warning");
  check("an overlapping season warns but does not block", warnings.length > 0);
}

// ---------------------------------------------------------------------------
// Integration — the path the customer actually takes
// ---------------------------------------------------------------------------

section("Integration through quoteStay");
{
  const listing = HOTELS[0];
  const property: PropertyRef = toPropertyRef(listing);
  const room = getRoomTypes(property)[0];
  const plan = ratePlansFor(property.vertical, property.id)[0];

  const quote = quoteStay({
    property,
    roomTypeId: room.id,
    ratePlanId: plan.id,
    checkIn: "2026-09-14",
    checkOut: "2026-09-17",
    units: 1,
    guests: 2,
    bookingDate: "2026-09-01",
  });

  equal("three nights are quoted", quote.nights.length, 3);
  check("the quote carries the engine's working", Boolean(quote.pricing));
  check("every night has a positive rate", quote.nights.every((n) => n.price > 0));
  check(
    "the subtotal is the sum of the nights, less any stay discount",
    quote.roomSubtotal <= quote.nights.reduce((sum, n) => sum + n.price, 0) + 0.01,
  );
  check(
    "…and is never negative or NaN",
    Number.isFinite(quote.roomSubtotal) && quote.roomSubtotal >= 0,
  );
  check(
    "each night reports its base rate too",
    quote.nights.every((n) => n.baseRate > 0),
  );

  // Quoting twice must give the same answer — determinism is the whole point.
  const again = quoteStay({
    property,
    roomTypeId: room.id,
    ratePlanId: plan.id,
    checkIn: "2026-09-14",
    checkOut: "2026-09-17",
    units: 1,
    guests: 2,
    bookingDate: "2026-09-01",
  });
  equal("the same request gives the same price", again.roomSubtotal, quote.roomSubtotal);

  // A manual override written through the inventory engine reaches the quote.
  const before = quote.nights[0].price;
  setPriceOverride({
    propertyId: property.id,
    roomTypeId: room.id,
    from: "2026-09-14",
    to: "2026-09-14",
    price: 999,
    reason: "Test pin",
    updatedBy: "test",
  });
  const pinned = quoteStay({
    property,
    roomTypeId: room.id,
    ratePlanId: plan.id,
    checkIn: "2026-09-14",
    checkOut: "2026-09-17",
    units: 1,
    guests: 2,
    bookingDate: "2026-09-01",
  });
  const planFactor = plan.baseRate !== undefined ? 1 : plan.priceFactor;
  equal("the pinned night is charged", pinned.nights[0].price, Math.round(999 * planFactor * 100) / 100);
  check("…and is flagged as overridden", pinned.nights[0].overridden);
  check("…while the other nights are untouched", pinned.nights[1].price === quote.nights[1].price);

  removePriceOverride(room.id, "2026-09-14", "2026-09-14");
  const lifted = quoteStay({
    property,
    roomTypeId: room.id,
    ratePlanId: plan.id,
    checkIn: "2026-09-14",
    checkOut: "2026-09-17",
    units: 1,
    guests: 2,
    bookingDate: "2026-09-01",
  });
  equal("lifting the override restores the rule price", lifted.nights[0].price, before);

  // A same-day request is not bookable and must not be priced.
  const sameDay = quoteStay({
    property,
    roomTypeId: room.id,
    ratePlanId: plan.id,
    checkIn: "2026-09-14",
    checkOut: "2026-09-14",
    units: 1,
    guests: 2,
  });
  equal("a same-day stay has no nights", sameDay.nights.length, 0);
  equal("…and costs nothing", sameDay.roomSubtotal, 0);
  check("…and says why", sameDay.blockers.some((b) => b.code === "no_dates"));

  // A rate plan the property doesn't sell falls back rather than crashing.
  const unknownPlan = quoteStay({
    property,
    roomTypeId: room.id,
    ratePlanId: "does_not_exist",
    checkIn: "2026-09-14",
    checkOut: "2026-09-16",
    units: 1,
    guests: 2,
  });
  check("an unknown rate plan still prices", unknownPlan.roomSubtotal > 0);
}

// ---------------------------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
