/**
 * Pricing module — the merchant and admin surfaces for dynamic pricing.
 *
 *   PricingOverview   tiles, the base-versus-charged chart and the calendar
 *   PricingCalendar   the month grid, and the full working for any night
 *   PricingRulesView  seasons, holidays, weekends, demand, window, LOS, guests
 *   RatePlansView     the packages a property sells
 *   PricingSettings   weekend days, guard rails and the admin review list
 *
 * Every one of them reads and writes through `pricingService`; none of them
 * computes a price.
 */

export { PricingOverview } from "./pricing-overview";
export { PricingCalendar } from "./pricing-calendar";
export { PricingRulesView } from "./rules-view";
export { RatePlansView } from "./rate-plans-view";
export { PricingSettings } from "./pricing-settings";
export { RuleForm, emptyRule } from "./rule-form";
export {
  usePricingScope,
  monthLabel,
  monthStart,
  daysInMonth,
  type PricingScope,
} from "./use-pricing-scope";
export {
  pricingKeys,
  usePriceOverrides,
  usePricingAnomalies,
  usePricingConfig,
  usePricingConfigs,
  usePricingOverview,
  usePricingRules,
  useRatePlans,
} from "./hooks";
