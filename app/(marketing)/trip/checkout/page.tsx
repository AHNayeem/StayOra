import type { Metadata } from "next";
import { TripCheckoutView } from "@/features/trip";

export const metadata: Metadata = {
  title: "Trip checkout",
  robots: { index: false, follow: false },
};

/**
 * Unified checkout — one payment, one booking per component. Auth-guarded
 * inside the view, like the single-product and flight checkouts.
 */
export default function TripCheckoutPage() {
  return (
    <main className="flex-1">
      <TripCheckoutView />
    </main>
  );
}
