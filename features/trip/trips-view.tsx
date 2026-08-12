"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Luggage,
  MapPin,
  Package,
  Users,
} from "lucide-react";
import { travelerCount } from "@/types/trip";
import { VERTICALS } from "@/constants/verticals";
import { useLocale } from "@/features/i18n";
import { buttonVariants } from "@/components/ui/button";
import { VerticalIcon } from "@/components/shared/vertical-icon";
import { useTrips, tripStatus } from "./trips-store";
import { TripStatusBadge, ComponentStatusBadge } from "./components/trip-status-badge";

/**
 * TripsView — "My Trips".
 *
 * A trip is shown as what it is: a group of independent bookings. The headline
 * status is derived from the components (never stored), and each component's
 * own state is visible at a glance, so a partially-confirmed trip reads
 * correctly instead of hiding a failure behind a green tick.
 */
export function TripsView() {
  const trips = useTrips();
  const { money, date } = useLocale();

  if (trips.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-line bg-surface p-10 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-primary-50 text-primary">
          <Luggage className="size-7" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-h4 text-ink">No trips yet</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-body">
          Book a flight and a hotel together and they&apos;ll appear here as one trip —
          with each booking keeping its own reference, policy and provider.
        </p>
        <Link
          href="/flights"
          className={`${buttonVariants({ variant: "primary", size: "md" })} mt-5`}
        >
          Plan a trip
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {trips.map((trip) => {
        const status = tripStatus(trip);
        const people = travelerCount(trip.travelers);
        return (
          <li
            key={trip.id}
            className="rounded-card border border-line bg-surface p-5 shadow-card"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-h4 font-bold text-ink">
                    {trip.destination} trip
                  </h2>
                  <TripStatusBadge status={status} />
                  {trip.segment === "b2b" && trip.organizationName && (
                    <span className="text-xs text-muted">{trip.organizationName}</span>
                  )}
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-4" aria-hidden="true" />
                    {trip.destinationLabel}
                  </span>
                  {trip.startDate && (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="size-4" aria-hidden="true" />
                      {date(trip.startDate, { dateStyle: "medium" })}
                      {trip.endDate &&
                        trip.endDate !== trip.startDate &&
                        ` – ${date(trip.endDate, { dateStyle: "medium" })}`}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="size-4" aria-hidden="true" />
                    {people}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Package className="size-4" aria-hidden="true" />
                    {trip.components.length} bookings
                  </span>
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-xs text-muted">{trip.reference}</p>
                <p className="text-h4 font-bold text-accent-600">{money(trip.totalUsd)}</p>
              </div>
            </div>

            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {trip.components.map((component) => (
                <li
                  key={component.bookingId}
                  className="flex items-center justify-between gap-3 rounded-field border border-line px-3 py-2"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <VerticalIcon
                      name={VERTICALS[component.kind].icon}
                      className="size-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink">
                        {component.title}
                      </span>
                      <span className="text-xs text-muted">{component.merchantName}</span>
                    </span>
                  </span>
                  <ComponentStatusBadge status={component.status} />
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/account/trips/${trip.id}`}
                className={buttonVariants({ variant: "primary", size: "sm" })}
              >
                Manage trip
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href="/trip"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Add a booking
              </Link>
              <Link
                href="/account/invoices"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                Invoices
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
