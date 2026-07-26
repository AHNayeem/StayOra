import type { MerchantWallet, WalletStatus } from "./types";

const MERCHANTS = [
  "Azure Bay Hospitality", "Highline Group", "Marina Living", "Cedarwood Stays",
  "Sunset Collective", "Palm Grove Resorts", "Metro Suites", "Northwind Lodges",
  "Coastline Villas", "Harbour & Co", "Alpine Retreats", "Old Town Rentals",
];
const CURRENCIES = ["USD", "GBP", "AED", "EUR"];
const STATUS_CYCLE: WalletStatus[] = [
  "active", "active", "active", "on_hold", "active", "frozen",
];

function iso(dayOffset: number): string {
  return new Date(Date.UTC(2026, 6, 1) - dayOffset * 86_400_000).toISOString();
}

export const WALLETS_SEED: MerchantWallet[] = MERCHANTS.map((merchant, i) => {
  const lifetimeEarnings = 42_000 + ((i * 9_400) % 210_000);
  const available = Math.round((lifetimeEarnings * 0.06 + i * 320) * 100) / 100;
  const pending = Math.round((lifetimeEarnings * 0.03 + i * 180) * 100) / 100;
  const status = STATUS_CYCLE[i % STATUS_CYCLE.length];
  const reserved =
    status === "active" ? 0 : Math.round(available * 0.25 * 100) / 100;
  return {
    id: `wlt_${300 + i}`,
    merchant,
    available,
    pending,
    reserved,
    lifetimeEarnings,
    currency: CURRENCIES[i % CURRENCIES.length],
    status,
    lastActivity: iso(i % 14),
  };
});
