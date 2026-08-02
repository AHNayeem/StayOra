import type { Metadata } from "next";
import { getFlightBookings } from "@/services/flight.service";
import { MyFlightsView } from "@/features/flights/account/my-flights-view";

export const metadata: Metadata = { title: "My flights" };

/**
 * My Flights — the traveller's flight bookings.
 *
 * Fetched server-side through the flight service; the client view merges in any
 * booking made in this browser so a flight booked seconds ago is already here.
 */
export default async function MyFlightsPage() {
  const bookings = await getFlightBookings();
  return <MyFlightsView bookings={bookings} />;
}
