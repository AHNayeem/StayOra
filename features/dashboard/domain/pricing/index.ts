/**
 * Dynamic pricing — the barrel.
 *
 * The one authoritative path from a room's base rate to what a traveller pays
 * for a night:
 *
 *   Property → Room → Rate plan → Base rate
 *            → resolveDailyRate()   (season, holiday, weekend, demand, override)
 *            → calculateStayPrice() (rate plan, booking window, LOS, guests,
 *                                    discounts)
 *            → priceBooking()       (taxes, fees, insurance, commission)
 *
 * `domain/inventory.ts` is the only caller of the first two steps: it owns the
 * base rate and availability, and it hands the result to the rest of the
 * product as a {@link import("../inventory").StayQuote}. Nothing else prices a
 * room, which is what stops two screens disagreeing about a number.
 *
 * Layers:
 *   types        the data model — plans, rules, configuration, engine output
 *   rules        matching, ordering, adjustment arithmetic, validation (pure)
 *   engine       one night, fully explained (pure)
 *   calculators  one stay, plus the customer-facing breakdown (pure)
 *   repository   where the records live, and the memoised resolution path
 *   mock-data    the shipped dataset, shaped like an API response
 */

export * from "./types";
export {
  adjustmentTypesFor,
  applyAdjustment,
  conditionMatches,
  daysBetween,
  describeAdjustment,
  effectiveCondition,
  isDailyRule,
  isRuleEligible,
  isStayRule,
  isValidISODate,
  isoRange,
  orderRules,
  rangesOverlap,
  roundRate,
  scopeMatches,
  todayISO,
  validateRule,
  weekdayOf,
  type ConditionTarget,
  type RuleProblem,
  type ScopeTarget,
} from "./rules";
export {
  FALLBACK_CONFIG,
  explainDailyRate,
  legacySeasonTag,
  resolveDailyRate,
} from "./engine";
export {
  calculateStayPrice,
  includedGuestsFor,
  toPriceBreakdown,
} from "./calculators";
export {
  DEFAULT_PRICING_CONFIG,
  activePricingRules,
  allPricingRules,
  clearPricingConfig,
  createPricingRule,
  createRatePlan,
  duplicatePricingRule,
  duplicateRatePlan,
  findPriceOverride,
  findRatePlan,
  getPricingRule,
  listPriceOverrides,
  listPricingConfigs,
  listPricingRules,
  listRatePlans,
  pricingConfigFor,
  removePricingRule,
  removeRatePlan,
  resolveCached,
  rulesForDate,
  savePricingConfig,
  seedPricingConfigs,
  seedPricingRules,
  seedRatePlans,
  updatePricingRule,
  updateRatePlan,
  upcomingRules,
  type RatePlanQuery,
  type RuleQuery,
} from "./repository";
