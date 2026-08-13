import type { Metadata } from "next";
import { BookingDetailView } from "./booking-detail-view";

type Params = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Booking" };

/**
 * A single booking.
 *
 * Catalogue bookings are read reactively from the domain store by the view, so
 * an operator's change shows without a refetch; flight and trip bookings still
 * come from their own client store and are resolved there too.
 */
export default async function BookingDetailPage({ params }: Params) {
  const { id } = await params;
  return <BookingDetailView id={id} />;
}
