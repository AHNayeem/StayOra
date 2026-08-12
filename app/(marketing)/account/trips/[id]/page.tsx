import type { Metadata } from "next";
import { TripDetailView } from "@/features/trip";

type Params = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Trip" };

/**
 * One booked trip. The group record lives in the traveller's browser and its
 * component statuses are read live from the platform booking store, so a retry
 * here — or an admin action elsewhere — is reflected without a refresh.
 */
export default async function TripDetailPage({ params }: Params) {
  const { id } = await params;
  return <TripDetailView tripId={id} />;
}
