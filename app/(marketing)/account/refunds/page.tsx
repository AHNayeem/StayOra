import type { Metadata } from "next";
import { RefundsView } from "./refunds-view";

export const metadata: Metadata = {
  title: "Refunds",
  description: "Track your refund requests and their status.",
};

export default function Page() {
  return <RefundsView />;
}
