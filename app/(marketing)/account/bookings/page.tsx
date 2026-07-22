import type { Metadata } from "next";
import { getBookings } from "@/services/account";
import { BookingsView } from "./bookings-view";

export const metadata: Metadata = { title: "Bookings" };

/** All of the traveler's bookings, filterable by status client-side. */
export default async function BookingsPage() {
  const bookings = await getBookings();
  return <BookingsView bookings={bookings} />;
}
