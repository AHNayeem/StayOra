import type { Metadata } from "next";
import { getBooking, getInvoice } from "@/services/account";
import { BookingDetailView } from "./booking-detail-view";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const booking = await getBooking(id);
  return { title: booking ? booking.title : "Booking" };
}

/**
 * A single booking with its billing summary. The server dataset is checked
 * first; when it has no match the client view falls back to a checkout-created
 * booking from the local store (and renders a not-found state if neither has
 * it), so freshly-booked trips open correctly without a server round-trip.
 */
export default async function BookingDetailPage({ params }: Params) {
  const { id } = await params;
  const booking = await getBooking(id);
  const invoice = booking ? await getInvoice(booking.invoiceId) : undefined;
  return <BookingDetailView id={id} booking={booking} invoice={invoice} />;
}
