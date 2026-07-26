import type { StatusDef } from "../../lib/status";

export const WALLET_STATUS_VALUES = ["active", "on_hold", "frozen"] as const;
export type WalletStatus = (typeof WALLET_STATUS_VALUES)[number];

export interface MerchantWallet {
  id: string;
  merchant: string;
  /** Cleared funds available for payout. */
  available: number;
  /** Funds held during the settlement window. */
  pending: number;
  /** Held against open disputes / chargebacks. */
  reserved: number;
  lifetimeEarnings: number;
  currency: string;
  status: WalletStatus;
  lastActivity: string;
}

export interface WalletSummary {
  totalHeld: number;
  totalAvailable: number;
  totalPending: number;
  activeWallets: number;
  currency: string;
}

export const WALLET_STATUSES: readonly StatusDef<WalletStatus>[] = [
  { value: "active", label: "Active", tone: "success" },
  { value: "on_hold", label: "On hold", tone: "warning" },
  { value: "frozen", label: "Frozen", tone: "danger" },
];
