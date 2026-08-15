/**
 * Disputes module — chargeback cases.
 *
 * The entity and its rules live in the domain (`domain/disputes`); this module
 * is the shared UI both the platform and the merchant use, with the moves each
 * side is allowed derived from the domain's transition table.
 */
export { disputeService, disputeKeys } from "./service";
export { disputeColumns } from "./columns";
export {
  useDisputes,
  useDisputeSummary,
  useRespondToDispute,
  useAcceptDisputeLiability,
  useDecideDispute,
} from "./hooks";
export { DisputesList } from "./list";
