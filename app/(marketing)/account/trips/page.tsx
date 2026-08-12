import type { Metadata } from "next";
import { AccountPageHeader } from "@/components/account/account-page-header";
import { TripsView } from "@/features/trip";

export const metadata: Metadata = { title: "My trips" };

/**
 * Trips the traveller has booked as a group. Each trip is a set of independent
 * bookings — the list shows the roll-up plus every component's own status.
 */
export default function TripsPage() {
  return (
    <div>
      <AccountPageHeader
        title="My trips"
        description="Multi-product trips you've booked together. Every component keeps its own booking, provider and policy."
      />
      <TripsView />
    </div>
  );
}
