"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarRange, MapPin, Users } from "lucide-react";
import type { TravelerBooking } from "@/types/traveler";
import { VERTICALS } from "@/constants/verticals";
import { useLocale } from "@/features/i18n";
import { cn } from "@/lib/utils";
import { StatusBadge, bookingStatusMeta } from "./status-badge";

interface BookingRowProps {
  booking: TravelerBooking;
  /** Compact variant for the overview (hides some meta). */
  compact?: boolean;
  className?: string;
}

/**
 * BookingRow — a horizontal booking summary used on the overview, bookings and
 * history pages. Client-side so dates and the total reprice with the active
 * locale/currency. The whole row links through to the booking detail.
 */
export function BookingRow({ booking, compact = false, className }: BookingRowProps) {
  const { date, money } = useLocale();
  const status = bookingStatusMeta(booking.status);
  const vertical = VERTICALS[booking.vertical];

  return (
    <div
      className={cn(
        "group relative flex gap-4 rounded-card border border-line bg-surface p-3 shadow-card transition-colors hover:border-primary/40",
        className,
      )}
    >
      <div className="relative size-20 shrink-0 overflow-hidden rounded-field sm:size-24">
        <Image
          src={booking.image}
          alt={booking.title}
          fill
          sizes="96px"
          className="object-cover"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <span className="text-overline text-primary">{vertical.label}</span>
          <StatusBadge label={status.label} tone={status.tone} />
        </div>

        <h3 className="truncate font-semibold text-ink">
          <Link
            href={`/account/bookings/${booking.id}`}
            className="transition-colors before:absolute before:inset-0 hover:text-primary"
          >
            {booking.title}
          </Link>
        </h3>

        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-body">
          <li className="inline-flex items-center gap-1.5">
            <MapPin className="size-4 shrink-0 text-muted" aria-hidden="true" />
            <span className="truncate">{booking.location}</span>
          </li>
          <li className="inline-flex items-center gap-1.5">
            <CalendarRange className="size-4 shrink-0 text-muted" aria-hidden="true" />
            {date(booking.checkIn)} – {date(booking.checkOut)}
          </li>
          {!compact && (
            <li className="inline-flex items-center gap-1.5">
              <Users className="size-4 shrink-0 text-muted" aria-hidden="true" />
              {booking.guests} {booking.guests === 1 ? "guest" : "guests"} · {booking.nights}{" "}
              {booking.nights === 1 ? "night" : "nights"}
            </li>
          )}
        </ul>

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span className="text-xs text-muted">Ref {booking.reference}</span>
          <span className="font-bold text-accent-600">{money(booking.totalUsd)}</span>
        </div>
      </div>
    </div>
  );
}
