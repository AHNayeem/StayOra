/**
 * Revenue Center module — the platform's own P&L.
 *
 * Reads the domain revenue ledger, which is the single definition of platform
 * revenue; this module only presents it.
 */
export { RevenueCenter } from "./revenue-center";
export {
  revenueKeys,
  useRevenueAdjustment,
  useRevenueCenter,
  useRevenueFilters,
  useRevenueLedger,
} from "./hooks";
