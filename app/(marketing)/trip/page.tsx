import type { Metadata } from "next";
import { TripCartView } from "@/features/trip";

export const metadata: Metadata = {
  title: "My trip",
  description:
    "Everything you're planning in one place — flights, stays, transfers and activities, priced as one trip.",
  robots: { index: false, follow: false },
};

/**
 * The unified trip cart. Entirely client-owned: the trip lives in the traveller's
 * browser until checkout, so it survives navigation between modules without a
 * server session.
 */
export default function TripPage() {
  return (
    <main className="flex-1">
      <TripCartView />
    </main>
  );
}
