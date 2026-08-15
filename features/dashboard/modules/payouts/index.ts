/**
 * Payouts module — a settlement seen as money leaving the platform.
 *
 * The entity is derived in the domain (`domain/payouts`) from a settlement plus
 * the merchant's payout instructions; there is no separate payout dataset.
 */
export { payoutService, payoutKeys } from "./service";
export { payoutColumns } from "./columns";
export { usePayouts, usePayoutSummary, useAdvancePayout } from "./hooks";
export { PayoutsList } from "./list";
