"use client";

import Link from "next/link";
import { Luggage, Ticket, Users } from "lucide-react";
import type { FlightBooking } from "@/types/flight";
import { AIRLINES_BY_CODE } from "@/lib/mock/airlines";
import { CABIN_SHORT_LABEL } from "@/lib/mock/fares";
import { airportLabel } from "@/lib/mock/airports";

import { useLocale } from "@/features/i18n";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge, bookingStatusMeta } from "@/components/account/status-badge";
import { AirlineLogo } from "../airline-logo";
import { SliceSummary } from "../results/slice-summary";
import { flightBookingHref } from "../booking/booking-url";

/**
 * FlightBookingCard — one booking in the My Flights list.
 *
 * Leads with the reference and PNR because those are what a traveller reaches
 * for when something goes wrong at an airport, and shows the same
 * departure→arrival strip as the results page so a booked flight reads exactly
 * like the offer it came from.
 */
export function FlightBookingCard({ booking }: { booking: FlightBooking }) {
  const { money, date } = useLocale();
  const airline = AIRLINES_BY_CODE[booking.airlineCode];
  const status = bookingStatusMeta(booking.status);
  const first = booking.slices[0];
  const last = booking.slices[booking.slices.length - 1];

  return (
    <article className="overflow-hidden rounded-card border border-line bg-surface shadow-card transition-colors hover:border-primary/50">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-muted/40 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <AirlineLogo code={booking.airlineCode} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">
              {airportLabel(first.fromCode)}{" "}
              {booking.tripType === "round-trip" ? "⇄" : "→"} {airportLabel(last.toCode)}
            </p>
            <p className="truncate text-xs text-muted">
              {airline?.name ?? booking.airlineCode} ·{" "}
              {CABIN_SHORT_LABEL[booking.cabin]}
            </p>
          </div>
        </div>
        <StatusBadge label={status.label} tone={status.tone} />
      </div>

      <div className="space-y-3 p-4">
        {booking.slices.map((slice, i) => (
          <div key={slice.id}>
            <p className="mb-1 text-[0.6875rem] font-medium uppercase tracking-wide text-muted">
              {booking.slices.length > 1
                ? booking.tripType === "round-trip"
                  ? i === 0
                    ? "Outbound"
                    : "Return"
                  : `Flight ${i + 1}`
                : "Departure"}{" "}
              · {date(slice.departLocal.slice(0, 10), { dateStyle: "medium" })}
            </p>
            <SliceSummary slice={slice} compact />
          </div>
        ))}

        <dl className="grid grid-cols-2 gap-3 border-t border-line pt-3 text-xs sm:grid-cols-4">
          <div>
            <dt className="text-muted">Reference</dt>
            <dd className="font-mono font-semibold text-ink">{booking.reference}</dd>
          </div>
          <div>
            <dt className="text-muted">Airline PNR</dt>
            <dd className="font-mono font-semibold text-ink">{booking.pnr}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1 text-muted">
              <Users className="size-3" aria-hidden="true" />
              Travellers
            </dt>
            <dd className="font-semibold text-ink">{booking.passengers.length}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1 text-muted">
              <Luggage className="size-3" aria-hidden="true" />
              Baggage
            </dt>
            <dd className="font-semibold text-ink">
              {booking.baggage.checkedKg > 0
                ? `${booking.baggage.checkedKg} kg`
                : "Cabin only"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
        <p className="text-sm">
          <span className="text-muted">Total paid </span>
          <span className="font-bold text-accent-600">
            {money(booking.grandTotalUsd)}
          </span>
        </p>
        <Link
          href={flightBookingHref(booking.id)}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Ticket className="size-4" aria-hidden="true" />
          View ticket
        </Link>
      </div>
    </article>
  );
}
