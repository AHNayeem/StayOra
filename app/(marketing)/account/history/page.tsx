import type { Metadata } from "next";
import { getTravelHistory, getTravelStats } from "@/services/account";
import { HistoryView } from "./history-view";

export const metadata: Metadata = { title: "Travel history" };

/** A record of every completed trip, with lifetime travel stats. */
export default async function HistoryPage() {
  const [history, stats] = await Promise.all([getTravelHistory(), getTravelStats()]);
  return <HistoryView history={history} stats={stats} />;
}
