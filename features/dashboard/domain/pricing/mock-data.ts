/**
 * The pricing dataset the prototype ships with.
 *
 * Everything here is *mock data in the shape of an API response*: plain arrays
 * of the same records `pricingService` returns, with no behaviour attached. When
 * a backend arrives, `repository.ts` swaps its reads for HTTP and this file is
 * deleted — nothing else has to change.
 *
 * The seasons below deliberately track the month-by-month curve the inventory
 * baseline used to hard-code, and the weekend rule carries the uplift that was
 * hard-coded next to it, so rate levels across the shipped catalogue stay where
 * they were. The difference is that the curve is now four editable seasons and
 * one editable weekend rule instead of an array of twelve magic numbers a
 * merchant could never see, let alone change.
 */

import type { BookingVertical } from "@/types/booking";
import type {
  PricingConfiguration,
  PricingRule,
  PricingRuleInput,
  RatePlan,
} from "./types";
import { GLOBAL_PRICING_CONFIG_ID } from "./types";

const SEEDED_AT = "2026-01-01T00:00:00.000Z";
const SEEDED_BY = "Platform";

/** Years the shipped seasons and holidays cover, relative to the current one. */
const SEASON_YEARS = 2;

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * The platform default.
 *
 * Friday and Saturday, not Saturday and Sunday: the prototype's home market is
 * Bangladesh, and assuming the Western weekend would misprice every weekend in
 * the catalogue. It is configuration precisely so other markets can differ.
 */
export const DEFAULT_PRICING_CONFIG: PricingConfiguration = {
  id: GLOBAL_PRICING_CONFIG_ID,
  scopeId: null,
  label: "Platform default",
  enabled: true,
  weekendDays: [5, 6],
  currency: "USD",
  demandPricingEnabled: true,
  guestPricingEnabled: true,
  minRateFactor: 0.5,
  maxRateFactor: 3,
  roundingIncrement: 1,
  updatedAt: SEEDED_AT,
  updatedBy: SEEDED_BY,
};

export function seedPricingConfigs(): PricingConfiguration[] {
  return [structuredClone(DEFAULT_PRICING_CONFIG)];
}

// ---------------------------------------------------------------------------
// Rate plans
// ---------------------------------------------------------------------------

const STAY_VERTICALS: BookingVertical[] = ["hotels", "resorts"];
const SELF_CATERING: BookingVertical[] = ["hotels", "resorts", "apartments", "shared-rooms"];

type SeedPlan = Omit<RatePlan, "createdAt" | "updatedAt" | "updatedBy" | "includesBreakfast">;

/**
 * The shipped rate plans.
 *
 * The first four are the plans the product has always sold, with their original
 * price factors and vertical availability — expressed as data now rather than
 * as a `switch` in `ratePlansFor`.
 */
const SEED_PLANS: SeedPlan[] = [
  {
    id: "standard",
    name: "Standard rate",
    description: "Room only. Free cancellation up to 5 days before arrival.",
    priceFactor: 1,
    currency: "USD",
    cancellationPolicyId: "moderate",
    mealPlan: "none",
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
    inclusions: ["Room only", "Free cancellation up to 5 days before"],
    builtIn: true,
  },
  {
    id: "non_refundable",
    name: "Non-refundable",
    description: "Our lowest price. Pay now — no changes, no refunds.",
    priceFactor: 0.86,
    currency: "USD",
    cancellationPolicyId: "non_refundable",
    mealPlan: "none",
    refundable: false,
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
    badge: "Best price",
    inclusions: ["14% off the standard rate", "No refund if you cancel"],
    builtIn: true,
  },
  {
    id: "breakfast",
    name: "Breakfast included",
    description: "Daily breakfast for every guest, plus a moderate policy.",
    priceFactor: 1.14,
    currency: "USD",
    cancellationPolicyId: "moderate",
    mealPlan: "breakfast",
    refundable: true,
    minStay: 1,
    maxStay: 30,
    closedToArrival: [],
    closedToDeparture: [],
    minAdvanceDays: 0,
    maxAdvanceDays: 0,
    status: "active",
    verticals: STAY_VERTICALS,
    propertyIds: [],
    roomTypeIds: [],
    badge: "Most popular",
    inclusions: ["Breakfast for all guests", "Free cancellation up to 5 days before"],
    builtIn: true,
  },
  {
    id: "flexible",
    name: "Fully flexible",
    description: "Change or cancel free of charge right up to check-in.",
    priceFactor: 1.22,
    currency: "USD",
    cancellationPolicyId: "flexible",
    mealPlan: "breakfast",
    refundable: true,
    minStay: 1,
    maxStay: 45,
    closedToArrival: [],
    closedToDeparture: [],
    minAdvanceDays: 0,
    maxAdvanceDays: 0,
    status: "active",
    verticals: SELF_CATERING,
    propertyIds: [],
    roomTypeIds: [],
    inclusions: [
      "Free cancellation up to 24 hours before",
      "Breakfast included",
      "Free date changes",
    ],
    builtIn: true,
  },
  {
    id: "half_board",
    name: "Half board",
    description: "Breakfast and dinner every day, with a moderate policy.",
    priceFactor: 1.34,
    currency: "USD",
    cancellationPolicyId: "moderate",
    mealPlan: "half_board",
    refundable: true,
    minStay: 2,
    maxStay: 21,
    closedToArrival: [],
    closedToDeparture: [],
    minAdvanceDays: 0,
    maxAdvanceDays: 0,
    status: "active",
    verticals: STAY_VERTICALS,
    propertyIds: [],
    roomTypeIds: [],
    badge: "Best value",
    inclusions: ["Breakfast and dinner daily", "Free cancellation up to 5 days before"],
    builtIn: true,
  },
  {
    id: "corporate",
    name: "Corporate rate",
    description:
      "Negotiated rate for contracted accounts. Late cancellation until 18:00 on arrival day.",
    priceFactor: 0.92,
    currency: "USD",
    cancellationPolicyId: "flexible",
    mealPlan: "breakfast",
    refundable: true,
    minStay: 1,
    maxStay: 60,
    // Corporate stays are weekday business; keep Friday arrivals off the plan.
    closedToArrival: [],
    closedToDeparture: [],
    minAdvanceDays: 0,
    maxAdvanceDays: 0,
    status: "active",
    verticals: ["hotels", "resorts", "apartments"],
    propertyIds: [],
    roomTypeIds: [],
    badge: "Negotiated",
    inclusions: ["8% off the standard rate", "Breakfast included", "Late cancellation"],
    builtIn: true,
  },
];

export function seedRatePlans(): RatePlan[] {
  return SEED_PLANS.map((plan) => ({
    ...structuredClone(plan),
    includesBreakfast: plan.mealPlan !== "none",
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
    updatedBy: SEEDED_BY,
  }));
}

// ---------------------------------------------------------------------------
// Pricing rules
// ---------------------------------------------------------------------------

const EMPTY_SCOPE = {
  propertyIds: [] as string[],
  roomTypeIds: [] as string[],
  ratePlanIds: [] as string[],
  verticals: [] as BookingVertical[],
};

function rule(id: string, input: PricingRuleInput): PricingRule {
  return {
    ...input,
    id,
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
    updatedBy: SEEDED_BY,
  };
}

function defaults(): Pick<
  PricingRuleInput,
  "scope" | "status" | "minStay" | "maxStay" | "closedToArrival" | "closedToDeparture"
> {
  return {
    scope: structuredClone(EMPTY_SCOPE),
    status: "active",
    minStay: 0,
    maxStay: 0,
    closedToArrival: false,
    closedToDeparture: false,
  };
}

/**
 * Seasons for one year.
 *
 * Priorities: the festive window outranks the low season it overlaps and does
 * not stack, so the first ten days of January price as festive rather than as
 * "low season plus a festive uplift". That is the conflict-resolution model in
 * one concrete, checkable case.
 */
function seasonsFor(year: number): PricingRule[] {
  return [
    rule(`prs_low_${year}`, {
      ...defaults(),
      name: `Low season ${year}`,
      description: "The quiet start of the year — rates come down to fill rooms.",
      type: "season",
      condition: { dateFrom: `${year}-01-01`, dateTo: `${year}-03-31` },
      adjustment: { type: "percent", value: -10 },
      priority: 50,
      stackable: true,
      calculationMode: "base_relative",
    }),
    rule(`prs_summer_${year}`, {
      ...defaults(),
      name: `Summer peak ${year}`,
      description: "School holidays and the leisure high season.",
      type: "season",
      condition: { dateFrom: `${year}-06-01`, dateTo: `${year}-08-31` },
      adjustment: { type: "percent", value: 22 },
      priority: 50,
      stackable: true,
      calculationMode: "base_relative",
      minStay: 2,
    }),
    rule(`prs_autumn_${year}`, {
      ...defaults(),
      name: `Autumn shoulder ${year}`,
      description: "Demand softens after the summer; a modest reduction keeps pace up.",
      type: "season",
      condition: { dateFrom: `${year}-10-01`, dateTo: `${year}-11-30` },
      adjustment: { type: "percent", value: -8 },
      priority: 50,
      stackable: true,
      calculationMode: "base_relative",
    }),
    rule(`prs_festive_${year}`, {
      ...defaults(),
      name: `Winter festive ${year}/${(year + 1) % 100}`,
      description:
        "Christmas through New Year. Outranks the low season it overlaps and does not stack.",
      type: "season",
      condition: { dateFrom: `${year}-12-15`, dateTo: `${year + 1}-01-10` },
      adjustment: { type: "percent", value: 30 },
      priority: 60,
      stackable: false,
      calculationMode: "base_relative",
      minStay: 3,
    }),
  ];
}

/**
 * Holidays for one year.
 *
 * Islamic dates move against the Gregorian calendar; the two Eid windows below
 * are the observed dates for the demo years and are exactly the kind of record
 * a backend feed would replace. Every holiday is non-stackable and outranks the
 * seasons and weekends it lands on.
 */
const EID_AL_FITR: Record<number, [string, string]> = {
  2026: ["03-20", "03-23"],
  2027: ["03-09", "03-12"],
  2028: ["02-26", "02-29"],
};

const EID_AL_ADHA: Record<number, [string, string]> = {
  2026: ["05-27", "05-30"],
  2027: ["05-16", "05-19"],
  2028: ["05-05", "05-08"],
};

function holidaysFor(year: number): PricingRule[] {
  const out: PricingRule[] = [
    rule(`prh_newyear_${year}`, {
      ...defaults(),
      name: `New Year's Eve ${year}`,
      description:
        "A fixed festive rate. Set as an override, so nothing else applies that night.",
      type: "holiday",
      condition: { dateFrom: `${year}-12-31`, dateTo: `${year}-12-31` },
      adjustment: { type: "multiplier", value: 1.9 },
      priority: 120,
      stackable: false,
      calculationMode: "override",
      minStay: 2,
      closedToArrival: false,
      closedToDeparture: false,
    }),
    rule(`prh_christmas_${year}`, {
      ...defaults(),
      name: `Christmas ${year}`,
      description: "Christmas Eve through Boxing Day.",
      type: "holiday",
      condition: { dateFrom: `${year}-12-24`, dateTo: `${year}-12-26` },
      adjustment: { type: "percent", value: 40 },
      priority: 100,
      stackable: false,
      calculationMode: "base_relative",
      minStay: 2,
    }),
    rule(`prh_boishakh_${year}`, {
      ...defaults(),
      name: `Pohela Boishakh ${year}`,
      description: "Bengali New Year.",
      type: "holiday",
      condition: { dateFrom: `${year}-04-14`, dateTo: `${year}-04-15` },
      adjustment: { type: "percent", value: 35 },
      priority: 100,
      stackable: false,
      calculationMode: "base_relative",
    }),
    rule(`prh_independence_${year}`, {
      ...defaults(),
      name: `Independence Day ${year}`,
      description: "26 March — a long-weekend surge in domestic travel.",
      type: "holiday",
      condition: { dateFrom: `${year}-03-26`, dateTo: `${year}-03-27` },
      adjustment: { type: "percent", value: 20 },
      priority: 100,
      stackable: false,
      calculationMode: "base_relative",
    }),
  ];

  const fitr = EID_AL_FITR[year];
  if (fitr) {
    out.push(
      rule(`prh_eid_fitr_${year}`, {
        ...defaults(),
        name: `Eid al-Fitr ${year}`,
        description: "The Eid holiday — the busiest domestic travel window of the year.",
        type: "holiday",
        condition: { dateFrom: `${year}-${fitr[0]}`, dateTo: `${year}-${fitr[1]}` },
        adjustment: { type: "percent", value: 50 },
        priority: 110,
        stackable: false,
        calculationMode: "base_relative",
        minStay: 2,
      }),
    );
  }

  const adha = EID_AL_ADHA[year];
  if (adha) {
    out.push(
      rule(`prh_eid_adha_${year}`, {
        ...defaults(),
        name: `Eid al-Adha ${year}`,
        description: "The second Eid holiday.",
        type: "holiday",
        condition: { dateFrom: `${year}-${adha[0]}`, dateTo: `${year}-${adha[1]}` },
        adjustment: { type: "percent", value: 45 },
        priority: 110,
        stackable: false,
        calculationMode: "base_relative",
        minStay: 2,
      }),
    );
  }

  return out;
}

/** Weekend, demand, booking-window, length-of-stay, guest and discount rules. */
function standingRules(): PricingRule[] {
  return [
    // --- weekend ----------------------------------------------------------
    rule("prw_weekend", {
      ...defaults(),
      name: "Weekend rate",
      description:
        "Applies to whichever weekdays the property's configuration calls the weekend.",
      type: "weekend",
      // No weekdays here on purpose: the rule inherits the configuration's, so
      // changing the weekend for a market changes this rule with it.
      condition: {},
      adjustment: { type: "percent", value: 18 },
      priority: 20,
      stackable: true,
      calculationMode: "base_relative",
    }),

    // --- demand -----------------------------------------------------------
    rule("prd_soft", {
      ...defaults(),
      name: "Soft demand",
      description: "Under a fifth sold — shave the rate to pick up business.",
      type: "demand",
      condition: { occupancyMax: 0.2 },
      adjustment: { type: "percent", value: -8 },
      priority: 40,
      stackable: true,
      calculationMode: "base_relative",
    }),
    rule("prd_building", {
      ...defaults(),
      name: "Demand building",
      description: "Half to four-fifths sold.",
      type: "demand",
      condition: { occupancyMin: 0.5, occupancyMax: 0.8 },
      adjustment: { type: "percent", value: 10 },
      priority: 40,
      stackable: true,
      calculationMode: "base_relative",
    }),
    rule("prd_high", {
      ...defaults(),
      name: "High demand",
      description: "Four-fifths sold or more.",
      type: "demand",
      condition: { occupancyMin: 0.8, occupancyMax: 0.95 },
      adjustment: { type: "percent", value: 20 },
      priority: 40,
      stackable: true,
      calculationMode: "base_relative",
    }),
    rule("prd_compression", {
      ...defaults(),
      name: "Compression",
      description: "Nearly sold out — the last rooms are worth the most.",
      type: "demand",
      condition: { occupancyMin: 0.95, occupancyMax: 1.01 },
      adjustment: { type: "percent", value: 35 },
      priority: 40,
      stackable: true,
      calculationMode: "base_relative",
    }),

    // --- booking window ---------------------------------------------------
    rule("prb_early_60", {
      ...defaults(),
      name: "Early bird — 60 days",
      description: "Booked two months or more ahead.",
      type: "booking_window",
      condition: { leadTimeMinDays: 60 },
      adjustment: { type: "percent", value: -15 },
      priority: 30,
      stackable: true,
      calculationMode: "base_relative",
    }),
    rule("prb_early_30", {
      ...defaults(),
      name: "Advance purchase — 30 days",
      description: "Booked between one and two months ahead.",
      type: "booking_window",
      condition: { leadTimeMinDays: 30, leadTimeMaxDays: 59 },
      adjustment: { type: "percent", value: -10 },
      priority: 30,
      stackable: true,
      calculationMode: "base_relative",
    }),
    rule("prb_last_minute", {
      ...defaults(),
      name: "Last-minute booking",
      description: "Booked inside a week of arrival.",
      type: "booking_window",
      condition: { leadTimeMaxDays: 6 },
      adjustment: { type: "percent", value: 15 },
      priority: 30,
      stackable: true,
      calculationMode: "base_relative",
    }),

    // --- length of stay ---------------------------------------------------
    rule("prl_3_nights", {
      ...defaults(),
      name: "3-night saver",
      description: "Three or four nights.",
      type: "length_of_stay",
      condition: { nightsMin: 3, nightsMax: 4 },
      adjustment: { type: "percent", value: -5 },
      priority: 25,
      stackable: true,
      calculationMode: "base_relative",
    }),
    rule("prl_5_nights", {
      ...defaults(),
      name: "5-night saver",
      description: "Five or six nights.",
      type: "length_of_stay",
      condition: { nightsMin: 5, nightsMax: 6 },
      adjustment: { type: "percent", value: -10 },
      priority: 25,
      stackable: true,
      calculationMode: "base_relative",
    }),
    rule("prl_weekly", {
      ...defaults(),
      name: "Weekly rate",
      description: "Seven nights or more.",
      type: "length_of_stay",
      condition: { nightsMin: 7 },
      adjustment: { type: "percent", value: -15 },
      priority: 25,
      stackable: true,
      calculationMode: "base_relative",
    }),

    // --- guests -----------------------------------------------------------
    rule("prg_extra_guest", {
      ...defaults(),
      name: "Extra guest",
      description:
        "Charged per guest beyond the two the rate covers, per night. Only where the property has guest pricing switched on.",
      type: "guest",
      condition: { guestsMin: 3 },
      adjustment: { type: "fixed", value: 25 },
      priority: 15,
      stackable: true,
      calculationMode: "base_relative",
      scope: { ...structuredClone(EMPTY_SCOPE), verticals: ["hotels", "resorts"] },
    }),

    // --- discounts --------------------------------------------------------
    rule("prc_extended_stay", {
      ...defaults(),
      name: "Extended stay saver",
      description: "A fortnight or longer.",
      type: "discount",
      condition: { nightsMin: 14 },
      adjustment: { type: "percent", value: 10 },
      priority: 10,
      stackable: true,
      calculationMode: "base_relative",
    }),
    rule("prc_flash", {
      ...defaults(),
      name: "Monsoon flash sale",
      description:
        "A blanket 12% off, ready to switch on. Paused so it does not distort the shipped rates.",
      type: "discount",
      condition: {},
      adjustment: { type: "percent", value: 12 },
      priority: 12,
      stackable: true,
      calculationMode: "base_relative",
      status: "paused",
    }),
  ];
}

/**
 * The whole shipped rule book.
 *
 * Seasons and holidays are generated for the current year and the next, which
 * is as far ahead as a rate calendar is ever browsed and keeps the rule count —
 * and therefore the per-night matching cost — bounded.
 */
export function seedPricingRules(currentYear = new Date().getUTCFullYear()): PricingRule[] {
  const years = Array.from({ length: SEASON_YEARS }, (_, i) => currentYear + i);
  return [
    ...years.flatMap(seasonsFor),
    ...years.flatMap(holidaysFor),
    ...standingRules(),
  ];
}
