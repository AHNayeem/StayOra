import type { Metadata } from "next";
import { getRewardsSummary } from "@/services/account";
import { RewardsView } from "./rewards-view";

export const metadata: Metadata = { title: "Rewards" };

/** Loyalty balance, tier progress and the points ledger. */
export default async function RewardsPage() {
  const summary = await getRewardsSummary();
  return <RewardsView summary={summary} />;
}
