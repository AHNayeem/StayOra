import type { Metadata } from "next";
import { RewardsView } from "./rewards-view";

export const metadata: Metadata = { title: "Rewards" };

/**
 * Loyalty balance, tiers and referrals. The ledger is the source of truth for
 * the balance, and checkout spends against the same one.
 */
export default function RewardsPage() {
  return <RewardsView />;
}
