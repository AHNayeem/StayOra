/**
 * Account tools — the traveller's own trips.
 *
 * Stays come from {@link "@/services/account"} and flights from
 * {@link "@/services/flight.service"}, the same two seams `/account/*` reads.
 * The assistant reports booking status; it never changes one. Cancellations and
 * refunds stay behind the existing confirmation flows, because they are
 * financially consequential.
 */

import type { FlightBooking } from "@/types/flight";
import type { TravelerBooking } from "@/types/traveler";
import { getBookings } from "@/services/account";
import { getFlightBookings } from "@/services/flight.service";
import { normalize } from "../lib/text";

export interface AIBookingsResult {
  stays: TravelerBooking[];
  flights: FlightBooking[];
  /** Total across both, before any filter/limit. */
  total: number;
}

/** How many of each kind an answer shows before pointing at `/account`. */
const LIST_LIMIT = 4;

/**
 * getUserBookings — the account's trips, newest first.
 *
 * Capped rather than exhaustive: a chat column is the wrong place to page
 * through sixteen bookings, and `total` lets the answer say how many were left
 * out instead of silently truncating.
 */
export async function getUserBookings(): Promise<AIBookingsResult> {
  const [stays, flights] = await Promise.all([getBookings(), getFlightBookings()]);
  return {
    stays: stays.slice(0, LIST_LIMIT),
    flights: flights.slice(0, LIST_LIMIT),
    total: stays.length + flights.length,
  };
}

/**
 * getTripDetails — the next upcoming trip, or the trips matching a keyword
 * (destination, title or booking reference). Returns everything it matched so
 * the answer can say "your Dubai booking" without guessing which one.
 */
export async function getTripDetails(query?: string): Promise<AIBookingsResult> {
  const all = await getUserBookings();
  const term = normalize(query ?? "");

  if (!term) {
    const upcomingStays = all.stays.filter((b) => b.status === "upcoming");
    const upcomingFlights = all.flights.filter((b) => b.status === "upcoming");
    return {
      stays: upcomingStays.slice(0, 3),
      flights: upcomingFlights.slice(0, 3),
      total: upcomingStays.length + upcomingFlights.length,
    };
  }

  const stays = all.stays.filter((b) =>
    normalize(`${b.title} ${b.location} ${b.reference} ${b.vertical}`).includes(term),
  );
  const flights = all.flights.filter((b) =>
    normalize(
      `${b.reference} ${b.slices.map((s) => `${s.fromCode} ${s.toCode}`).join(" ")}`,
    ).includes(term),
  );

  return { stays: stays.slice(0, 4), flights: flights.slice(0, 4), total: stays.length + flights.length };
}
