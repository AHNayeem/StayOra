import type { Metadata } from "next";
import { MembershipView } from "./membership-view";

export const metadata: Metadata = { title: "Membership" };

/**
 * StayOra membership — the paid subscription, distinct from earned loyalty
 * tiers. Buying one creates a real subscription and a real revenue entry, and
 * checkout honours the benefits immediately.
 */
export default function MembershipPage() {
  return <MembershipView />;
}
