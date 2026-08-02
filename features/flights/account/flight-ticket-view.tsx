"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Ban, Luggage, Plane, Ticket, User } from "lucide-react";
import type { BoardingPass, FlightBooking } from "@/types/flight";
import { getBoardingPasses } from "@/services/flight.service";
import { AIRLINES_BY_CODE } from "@/lib/mock/airlines";
import { CABIN_LABEL } from "@/lib/mock/fares";
import { airportLabel } from "@/lib/mock/airports";
import { ancillaryLines } from "@/lib/mock/ancillaries";
import { STAGE_STEPS, stageIndex, PASSENGER_TYPE_LABEL } from "@/lib/mock/passengers";
import { boardingPassAvailable } from "@/lib/mock/boarding-pass";
import { formatDuration } from "@/lib/flight-time";
import { useHydrated } from "@/hooks/use-hydrated";
import { useLocale } from "@/features/i18n";
import { AccountPageHeader } from "@/components/account/account-page-header";
import { AccountEmpty } from "@/components/account/account-empty";
import { StatusBadge, bookingStatusMeta } from "@/components/account/status-badge";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { Icon } from "@/components/shared/lucide-icon";
import { cn } from "@/lib/utils";
import { AirlineLogo } from "../airline-logo";
import { SegmentTimeline } from "../results/segment-timeline";
import { FareBreakdownPanel } from "../pricing/fare-breakdown";
import { useResolvedFlightBooking } from "../bookings-store";
import { BoardingPassCard } from "./boarding-pass-card";
import { TicketActions } from "./ticket-actions";

/**
 * FlightTicketView — one booking in full: status timeline, itinerary,
 * travellers, boarding passes, price breakdown and every post-booking action.
 *
 * Boarding passes are gated on the real 24-hour check-in window rather than
 * always shown, because a pass that exists a month early trains travellers to
 * ignore the one that matters. Before the window opens, the page says exactly
 * when it will.
 */
export function FlightTicketView({
  id,
  booking: server,
}: {
  id: string;
  /** Undefined when the booking was made in this browser and isn't on the server. */
  booking?: FlightBooking;
}) {
  const { money, date } = useLocale();
  const booking = useResolvedFlightBooking(id, server);

  const hydrated = useHydrated();
  const [passes, setPasses] = useState<BoardingPass[] | null>(null);

  /**
   * Whether the 24-hour check-in window has opened.
   *
   * Derived at render, gated on hydration: reading the clock during SSR would
   * bake a server timestamp into cached HTML, and a page cached an hour before
   * the window opens would show passes that shouldn't exist yet. Both the server
   * and the first client render evaluate `false`, so there's no mismatch.
   */
  const checkInOpen =
    hydrated && booking
      ? boardingPassAvailable(booking, new Date().toISOString().slice(0, 16))
      : false;

  useEffect(() => {
    if (!checkInOpen || !booking) return;
    let cancelled = false;
    getBoardingPasses(booking).then((result) => {
      if (!cancelled) setPasses(result);
    });
    return () => {
      cancelled = true;
    };
  }, [checkInOpen, booking]);

  // Neither the server nor the local store has it — a stale link, most likely.
  if (!booking) {
    return (
      <div>
        <AccountPageHeader
          title="Flight not found"
          back={{ href: "/account/flights", label: "All flights" }}
        />
        <AccountEmpty
          icon={Ticket}
          title="We couldn't find that booking"
          description="It may have been removed, or the link is out of date."
          action={
            <Link
              href="/account/flights"
              className={buttonVariants({ variant: "primary", size: "sm" })}
            >
              View all flights
            </Link>
          }
        />
      </div>
    );
  }

  const airline = AIRLINES_BY_CODE[booking.airlineCode];
  const status = bookingStatusMeta(booking.status);
  const first = booking.slices[0];
  const last = booking.slices[booking.slices.length - 1];
  const lines = ancillaryLines(booking.ancillaries, {
    adults: booking.passengers.filter((p) => p.type === "adult").length,
    children: booking.passengers.filter((p) => p.type === "child").length,
    infants: booking.passengers.filter((p) => p.type === "infant").length,
  });

  const currentStage = booking.status === "cancelled" ? -1 : stageIndex(booking.stage);

  return (
    <>
      <AccountPageHeader
        title={`${airportLabel(first.fromCode)} ${booking.tripType === "round-trip" ? "⇄" : "→"} ${airportLabel(last.toCode)}`}
        description={`${airline?.name ?? booking.airlineCode} · ${CABIN_LABEL[booking.cabin]} · booked ${date(booking.bookedAt.slice(0, 10), { dateStyle: "medium" })}`}
        back={{ href: "/account/flights", label: "All flights" }}
        actions={<StatusBadge label={status.label} tone={status.tone} />}
      />

      {booking.status === "cancelled" && (
        <div className="mb-6 flex items-start gap-2.5 rounded-card border border-danger/30 bg-danger/5 p-4">
          <Ban className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
          <p className="text-sm text-body">
            This booking has been cancelled. Any refund due is processed to your original
            payment method within 7–10 working days.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="min-w-0 space-y-6">
          {/* ---- References + actions --------------------------------------- */}
          <section className="rounded-card border border-line bg-surface p-5 shadow-card">
            <div className="flex flex-wrap items-center gap-4">
              <AirlineLogo code={booking.airlineCode} size="lg" />
              <dl className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-muted">Booking reference</dt>
                  <dd className="font-mono text-sm font-bold text-ink">
                    {booking.reference}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Airline PNR</dt>
                  <dd className="font-mono text-sm font-bold text-primary">
                    {booking.pnr}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Fare type</dt>
                  <dd className="text-sm font-semibold text-ink">
                    {booking.refundable ? "Refundable" : "Non-refundable"}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="mt-4 border-t border-line pt-4">
              <TicketActions booking={booking} />
            </div>
          </section>

          {/* ---- Status timeline -------------------------------------------- */}
          <section className="rounded-card border border-line bg-surface p-5 shadow-card">
            <h2 className="mb-4 text-base font-semibold text-ink">Booking status</h2>
            <ol className="space-y-0">
              {STAGE_STEPS.map((step, i) => {
                const done = currentStage >= i;
                const active = currentStage === i;
                return (
                  <li key={step.stage} className="flex gap-3">
                    <span className="flex flex-col items-center">
                      <span
                        className={cn(
                          "grid size-8 shrink-0 place-items-center rounded-full transition-colors",
                          done ? "bg-primary text-white" : "bg-surface-muted text-muted",
                          active && "ring-4 ring-primary/20",
                        )}
                      >
                        <Icon name={step.icon} className="size-4" aria-hidden="true" />
                      </span>
                      {i < STAGE_STEPS.length - 1 && (
                        <span
                          className={cn(
                            "w-px flex-1",
                            done ? "bg-primary/40" : "bg-line",
                          )}
                          aria-hidden="true"
                        />
                      )}
                    </span>
                    <div className={cn("min-w-0 pb-5", i === STAGE_STEPS.length - 1 && "pb-0")}>
                      <p
                        className={cn(
                          "text-sm font-medium",
                          done ? "text-ink" : "text-muted",
                        )}
                      >
                        {step.label}
                        {active && (
                          <Badge variant="primary" size="sm" className="ml-2">
                            Current
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted">{step.description}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* ---- Itinerary --------------------------------------------------- */}
          <section className="rounded-card border border-line bg-surface p-5 shadow-card">
            <h2 className="mb-4 text-base font-semibold text-ink">Itinerary</h2>
            <div className="space-y-8">
              {booking.slices.map((slice, i) => (
                <div key={slice.id}>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {booking.slices.length > 1
                        ? booking.tripType === "round-trip"
                          ? i === 0
                            ? "Outbound"
                            : "Return"
                          : `Flight ${i + 1}`
                        : "Journey"}
                    </Badge>
                    <span className="text-sm text-muted">
                      {date(slice.departLocal.slice(0, 10), { dateStyle: "full" })} ·{" "}
                      {formatDuration(slice.durationMinutes)}
                    </span>
                  </div>
                  <SegmentTimeline slice={slice} />
                </div>
              ))}
            </div>
          </section>

          {/* ---- Boarding passes -------------------------------------------- */}
          <section>
            <h2 className="mb-4 text-base font-semibold text-ink">Boarding passes</h2>
            {booking.status === "cancelled" ? (
              <p className="rounded-card border border-line bg-surface p-6 text-center text-sm text-muted">
                Boarding passes aren&apos;t available for a cancelled booking.
              </p>
            ) : !checkInOpen ? (
              <div className="rounded-card border border-dashed border-line bg-surface p-8 text-center">
                <Ticket className="mx-auto size-7 text-muted" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium text-ink">
                  Check-in opens 24 hours before departure
                </p>
                <p className="mt-1 text-sm text-muted">
                  We&apos;ll email you when it does, and your boarding passes will appear
                  here.
                </p>
              </div>
            ) : passes === null ? (
              <div className="space-y-3">
                <Skeleton className="h-56 w-full rounded-card" />
              </div>
            ) : (
              <ul className="space-y-4">
                {passes.map((pass) => (
                  <li key={pass.id}>
                    <BoardingPassCard pass={pass} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ---- Travellers -------------------------------------------------- */}
          <section className="rounded-card border border-line bg-surface p-5 shadow-card">
            <h2 className="mb-4 text-base font-semibold text-ink">Travellers</h2>
            <ul className="space-y-3">
              {booking.passengers.map((passenger) => (
                <li
                  key={passenger.id}
                  className="flex flex-wrap items-start gap-3 rounded-field border border-line p-3"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-field bg-surface-muted text-muted">
                    <User className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">
                      {passenger.title} {passenger.firstName} {passenger.lastName}
                    </p>
                    <p className="text-xs text-muted">
                      {PASSENGER_TYPE_LABEL[passenger.type]} · Ticket{" "}
                      <span className="font-mono">
                        {booking.ticketNumbers[passenger.id] ?? "pending"}
                      </span>
                    </p>
                  </div>
                  {passenger.seats && Object.keys(passenger.seats).length > 0 && (
                    <span className="flex shrink-0 flex-wrap gap-1">
                      {Object.entries(passenger.seats).map(([segmentId, seat]) => (
                        <Badge key={segmentId} variant="primary" size="sm">
                          {seat}
                        </Badge>
                      ))}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* ---- Sidebar ------------------------------------------------------- */}
        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="rounded-card border border-line bg-surface p-5 shadow-card">
            <h2 className="mb-4 text-base font-semibold text-ink">What you paid</h2>
            <FareBreakdownPanel
              fare={booking.fare}
              seatsUsd={booking.seatsTotalUsd}
              ancillaries={lines}
              couponDiscountUsd={booking.couponDiscountUsd}
              couponCode={booking.couponCode}
              grandTotalUsd={booking.grandTotalUsd}
            />
            <p className="mt-3 border-t border-line pt-3 text-xs text-muted">
              Paid with {booking.paymentMethod}
            </p>
            <Link
              href={`/account/invoices`}
              className={`${buttonVariants({ variant: "outline", size: "sm", fullWidth: true })} mt-3`}
            >
              View invoice
            </Link>
          </div>

          <div className="rounded-card border border-line bg-surface p-5 shadow-card">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-ink">
              <Luggage className="size-4 text-primary" aria-hidden="true" />
              Baggage
            </h2>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Cabin</dt>
                <dd className="font-medium text-ink">{booking.baggage.cabinKg} kg</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Checked</dt>
                <dd className="font-medium text-ink">
                  {booking.baggage.checkedKg > 0
                    ? `${booking.baggage.checkedKg} kg`
                    : "Not included"}
                </dd>
              </div>
            </dl>
          </div>

          {lines.length > 0 && (
            <div className="rounded-card border border-line bg-surface p-5 shadow-card">
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-ink">
                <Plane className="size-4 text-primary" aria-hidden="true" />
                Extras booked
              </h2>
              <ul className="space-y-1.5 text-sm">
                {lines.map((line) => (
                  <li key={line.option.id} className="flex justify-between gap-2">
                    <span className="min-w-0 truncate text-body">{line.option.label}</span>
                    <span className="shrink-0 font-medium text-ink">
                      {line.option.free ? "Free" : money(line.totalUsd)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
