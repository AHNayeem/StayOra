/**
 * Commission module types — the ledger lives in the domain layer so the admin
 * dashboard, the merchant earnings page and the settlement roll-up all read the
 * same entries.
 */

export type { CommissionEntry, CommissionStatus } from "../../domain/types";
export type { PlatformFinancials, MerchantFinancials } from "../../domain/money";

import type { StatusDef } from "../../lib/status";
import type { CommissionStatus } from "../../domain/types";

/** Status registry — the single source for commission labels + tones. */
export const COMMISSION_STATUSES: readonly StatusDef<CommissionStatus>[] = [
  { value: "pending", label: "Pending", tone: "warning" },
  { value: "settled", label: "Settled", tone: "success" },
  { value: "reversed", label: "Reversed", tone: "danger" },
  { value: "adjusted", label: "Adjusted", tone: "info" },
];
