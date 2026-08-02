"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PlaneTakeoff } from "lucide-react";
import type { FlightBooking } from "@/types/flight";
import type { BookingStatus } from "@/types/traveler";
import { AccountEmpty } from "@/components/account/account-empty";
import { AccountPageHeader } from "@/components/account/account-page-header";
import { buttonVariants } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { useMergedFlightBookings } from "../bookings-store";
import { FlightBookingCard } from "./flight-booking-card";

/** Status tabs, in the order travellers care about them. */
const FILTERS: Array<{ key: BookingStatus | "all"; label: string }> = [
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "all", label: "All" },
];

/**
 * MyFlightsView — the traveller's flight bookings, grouped by status.
 *
 * Defaults to Upcoming rather than All: the overwhelming reason to open this
 * page is a flight you're about to take, and a chronological list that leads
 * with a trip from last year buries it.
 *
 * Bookings made in this browser are merged over the server set (see
 * `bookings-store`), so a flight booked moments ago appears here immediately.
 */
export function MyFlightsView({ bookings }: { bookings: FlightBooking[] }) {
  const merged = useMergedFlightBookings(bookings);
  const [filter, setFilter] = useState<BookingStatus | "all">("upcoming");

  const counts = useMemo(() => {
    const byStatus: Record<string, number> = { all: merged.length };
    for (const booking of merged) {
      byStatus[booking.status] = (byStatus[booking.status] ?? 0) + 1;
    }
    return byStatus;
  }, [merged]);

  const visible = useMemo(() => {
    const list =
      filter === "all" ? merged : merged.filter((b) => b.status === filter);
    // Upcoming reads soonest-first; history reads most-recent-first.
    return [...list].sort((a, b) =>
      filter === "upcoming"
        ? a.slices[0].departLocal.localeCompare(b.slices[0].departLocal)
        : b.slices[0].departLocal.localeCompare(a.slices[0].departLocal),
    );
  }, [merged, filter]);

  return (
    <>
      <AccountPageHeader
        title="My flights"
        description="Tickets, boarding passes and everything you need before you fly."
        actions={
          <Link href="/flights" className={buttonVariants({ variant: "primary", size: "sm" })}>
            Book a flight
          </Link>
        }
      />

      {merged.length === 0 ? (
        <AccountEmpty
          icon={PlaneTakeoff}
          title="No flights booked yet"
          description="When you book a flight, your tickets, boarding passes and trip details will live here."
          action={
            <Link href="/flights" className={buttonVariants({ variant: "primary", size: "md" })}>
              Search flights
            </Link>
          }
        />
      ) : (
        <>
          <Tabs
            variant="pill"
            value={filter}
            onValueChange={(key) => setFilter(key as BookingStatus | "all")}
            renderPanels={false}
            items={FILTERS.map((f) => ({
              key: f.key,
              label: `${f.label}${counts[f.key] ? ` (${counts[f.key]})` : ""}`,
            }))}
            className="mb-5"
          />

          {visible.length === 0 ? (
            <AccountEmpty
              icon={PlaneTakeoff}
              title={`No ${filter} flights`}
              description="Switch tabs to see your other bookings."
            />
          ) : (
            <ul className="space-y-4">
              {visible.map((booking) => (
                <li key={booking.id}>
                  <FlightBookingCard booking={booking} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
