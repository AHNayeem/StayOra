import { createStubService } from "../../crud";
import type { MerchantWallet, WalletSummary } from "./types";
import { WALLETS_SEED } from "./data";

/** Merchant wallet balances (in-memory stub; repository-ready). */
export const walletsService = createStubService<MerchantWallet>({
  seed: WALLETS_SEED,
  getId: (row) => row.id,
  searchFields: ["merchant"],
  idPrefix: "wlt",
});

/** Aggregate KPIs — mirrors a `/finance/wallets/summary` endpoint. */
export function getWalletSummary(): Promise<WalletSummary> {
  const totalAvailable = WALLETS_SEED.reduce((s, w) => s + w.available, 0);
  const totalPending = WALLETS_SEED.reduce((s, w) => s + w.pending, 0);
  const totalReserved = WALLETS_SEED.reduce((s, w) => s + w.reserved, 0);
  const summary: WalletSummary = {
    totalHeld: Math.round((totalAvailable + totalPending + totalReserved) * 100) / 100,
    totalAvailable: Math.round(totalAvailable * 100) / 100,
    totalPending: Math.round(totalPending * 100) / 100,
    activeWallets: WALLETS_SEED.filter((w) => w.status === "active").length,
    currency: "USD",
  };
  return new Promise((resolve) => setTimeout(() => resolve(summary), 300));
}

export const walletKeys = {
  all: ["finance", "wallets"] as const,
  summary: ["finance", "wallets", "summary"] as const,
};
