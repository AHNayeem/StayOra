import type { Metadata } from "next";
import { BookingsView } from "./bookings-view";

export const metadata: Metadata = { title: "Bookings" };

/**
 * All of the traveler's bookings, filterable by status client-side.
 *
 * Catalogue bookings are read reactively from the domain store by the view, so
 * nothing needs fetching here; the flight and trip verticals keep their own
 * client stores and are merged in by the view.
 */
export default function BookingsPage() {
  return <BookingsView bookings={[]} />;
}
