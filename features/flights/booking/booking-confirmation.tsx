"use client";

import Link from "next/link";
import { CheckCircle2, Mail, Plane, Ticket, Users } from "lucide-react";
import type { FlightContact, FlightOffer, FlightPassenger } from "@/types/flight";
import { airportLabel } from "@/lib/mock/airports";
import { AIRLINES_BY_CODE } from "@/lib/mock/airlines";
import { CABIN_LABEL } from "@/lib/mock/fares";
import { formatTime } from "@/lib/flight-time";
import { useLocale } from "@/features/i18n";
import { Container } from "@/components/ui/container";
import { buttonVariants } from "@/components/ui/button";
import { AirlineLogo } from "../airline-logo";
import { flightBookingHref } from "./booking-url";

interface BookingConfirmationProps {
  bookingId: string;
  reference: string;
  pnr: string;
  offer: FlightOffer;
  passengers: FlightPassenger[];
  contact: FlightContact;
}

/**
 * BookingConfirmation — the screen after payment clears.
 *
 * Leads with the two things the traveller needs to keep: the Otithee reference
 * and the airline PNR. The PNR matters more than it looks — it's what an airline
 * call centre or check-in desk asks for, and burying it in an email is how
 * people end up stuck at an airport with no way to identify their booking.
 */
export function BookingConfirmation({
  bookingId,
  reference,
  pnr,
  offer,
  passengers,
  contact,
}: BookingConfirmationProps) {
  const { money, date } = useLocale();
  const airline = AIRLINES_BY_CODE[offer.airlineCode];
  const first = offer.slices[0];
  const last = offer.slices[offer.slices.length - 1];

  return (
    <Container className="py-10 md:py-14">
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-500/12 text-emerald-600">
            <CheckCircle2 className="size-9" aria-hidden="true" />
          </div>
          <h1 className="mt-5 text-h3 text-ink">You&apos;re booked</h1>
          <p className="mt-2 text-body">
            Your e-tickets have been issued and sent to{" "}
            <strong className="font-medium text-ink">{contact.email}</strong>.
          </p>
        </div>

        {/* References */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-card border border-line bg-surface p-4 text-center shadow-card">
            <p className="text-xs uppercase tracking-wide text-muted">
              Otithee reference
            </p>
            <p className="mt-1 font-mono text-lg font-bold text-ink">{reference}</p>
          </div>
          <div className="rounded-card border border-primary/30 bg-primary-50 p-4 text-center">
            <p className="text-xs uppercase tracking-wide text-primary-700">
              Airline booking code (PNR)
            </p>
            <p className="mt-1 font-mono text-lg font-bold text-primary-700">{pnr}</p>
          </div>
        </div>
        <p className="mt-2 text-center text-xs text-muted">
          Use the PNR when checking in with {airline?.name ?? offer.airlineCode} or
          contacting them directly.
        </p>

        {/* Itinerary summary */}
        <div className="mt-6 rounded-card border border-line bg-surface p-5 shadow-card">
          <div className="flex items-center gap-3 border-b border-line pb-4">
            <AirlineLogo code={offer.airlineCode} size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">
                {airportLabel(first.fromCode)}{" "}
                {offer.tripType === "round-trip" ? "⇄" : "→"} {airportLabel(last.toCode)}
              </p>
              <p className="text-xs text-muted">
                {airline?.name ?? offer.airlineCode} · {CABIN_LABEL[offer.cabin]} ·{" "}
                {offer.fareBrand}
              </p>
            </div>
          </div>

          <ul className="space-y-3 py-4">
            {offer.slices.map((slice, i) => (
              <li key={slice.id} className="flex items-start gap-3">
                <Plane className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">
                    {offer.slices.length > 1
                      ? offer.tripType === "round-trip"
                        ? i === 0
                          ? "Outbound"
                          : "Return"
                        : `Flight ${i + 1}`
                      : "Departure"}{" "}
                    · {date(slice.departLocal.slice(0, 10), { dateStyle: "full" })}
                  </p>
                  <p className="text-xs text-muted">
                    {slice.fromCode} {formatTime(slice.departLocal)} → {slice.toCode}{" "}
                    {formatTime(slice.arriveLocal)}
                    {slice.dayOffset > 0 && ` (+${slice.dayOffset} day)`}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <dl className="grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
            <div>
              <dt className="flex items-center gap-1.5 text-xs text-muted">
                <Users className="size-3.5" aria-hidden="true" />
                Travellers
              </dt>
              <dd className="mt-0.5 font-medium text-ink">{passengers.length}</dd>
            </div>
            <div className="text-right">
              <dt className="text-xs text-muted">Total paid</dt>
              <dd className="mt-0.5 font-bold text-accent-600">
                {money(offer.fare.totalUsd)}
              </dd>
            </div>
          </dl>
        </div>

        {/* What happens next */}
        <div className="mt-6 rounded-card border border-line bg-surface-muted/50 p-5">
          <h2 className="mb-3 text-sm font-semibold text-ink">What happens next</h2>
          <ol className="space-y-2.5 text-sm text-body">
            <Next icon={Mail}>
              Your confirmation and e-tickets are on the way to {contact.email}.
            </Next>
            <Next icon={Ticket}>
              Online check-in opens 24–48 hours before departure. We&apos;ll email you when
              it does, and your boarding passes will appear under My Flights.
            </Next>
            <Next icon={Plane}>
              Arrive at the airport at least 3 hours before an international departure, or
              2 hours for a domestic one.
            </Next>
          </ol>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href={flightBookingHref(bookingId)}
            className={buttonVariants({ variant: "primary", size: "md" })}
          >
            View your ticket
          </Link>
          <Link
            href="/account/flights"
            className={buttonVariants({ variant: "outline", size: "md" })}
          >
            My flights
          </Link>
          <Link href="/flights" className={buttonVariants({ variant: "ghost", size: "md" })}>
            Book another flight
          </Link>
        </div>
      </div>
    </Container>
  );
}

function Next({
  icon: Icon,
  children,
}: {
  icon: typeof Mail;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}
