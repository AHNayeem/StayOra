import type { Metadata } from "next";
import { getFlightBooking } from "@/services/flight.service";
import { airportLabel } from "@/lib/mock/airports";
import { FlightTicketView } from "@/features/flights/account/flight-ticket-view";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const booking = await getFlightBooking(id);
  if (!booking) return { title: "Flight booking" };
  const first = booking.slices[0];
  const last = booking.slices[booking.slices.length - 1];
  return { title: `${airportLabel(first.fromCode)} → ${airportLabel(last.toCode)}` };
}

/**
 * A single flight booking: ticket, boarding passes and post-booking actions.
 *
 * The server dataset is checked first; when it has no match the client view
 * falls back to a booking created in this browser (and renders a not-found
 * state if neither has it), so a flight booked moments ago opens correctly
 * without a server round-trip. Same pattern as the stay booking detail.
 */
export default async function FlightTicketPage({ params }: Params) {
  const { id } = await params;
  const booking = await getFlightBooking(id);
  return <FlightTicketView id={id} booking={booking} />;
}
