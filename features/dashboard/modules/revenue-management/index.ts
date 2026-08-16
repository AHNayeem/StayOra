/**
 * Revenue management module — the layer above the rate calendar.
 *
 * Occupancy, ADR, RevPAR, pace, forecast and recommendations, all derived from
 * the same inventory baseline and booking ledger the calendar edits. Applying a
 * recommendation writes an ordinary inventory override.
 */
export { RevenueManager } from "./revenue-manager";
export {
  rmKeys,
  useApplyRecommendation,
  useBookingPace,
  useBookingPerformance,
  useCreateRecommendationRule,
  useDeleteRecommendationRule,
  useRecommendationRules,
  useUpdateRecommendationRule,
} from "./hooks";
