/**
 * Settlements module — merchant payout batches.
 *
 * A settlement is the period roll-up of a merchant's earnings, net of the
 * commission the platform keeps and of refunds it had to return. The batch is
 * derived from the booking ledger by the domain, which means a refund approved
 * today immediately changes what settles this month.
 */
export type { Settlement, SettlementStatus } from "../../domain/types";
export { SETTLEMENT_STATUSES, SETTLEMENT_TRANSITIONS } from "../../domain/lifecycle";
export { settlementService } from "../../domain/services";
export { settlementColumns } from "./columns";
export {
  settlementKeys,
  useSettlementAdvance,
  useSettlementBookings,
  useSettlements,
} from "./hooks";
export { SettlementsList } from "./list";
export { MerchantEarnings } from "./earnings";
