"use client";

import { Clock, Globe2, Map, PlaneLanding, PlaneTakeoff } from "lucide-react";
import type { FlightSlice } from "@/types/flight";
import { AIRPORTS_BY_CODE } from "@/lib/mock/airports";
import { formatUtcOffset, timeDifferenceLabel } from "@/lib/flight-time";

/**
 * AirportInfo — origin and destination facts, plus the clock difference.
 *
 * The time-difference line is the point of this panel. Flight times are shown in
 * each airport's *local* clock throughout the module, which is correct but can
 * look wrong — a Dhaka→Dubai flight that leaves at 07:00 and lands at 10:20 has
 * not taken three hours. Stating the offset explicitly is what makes the rest of
 * the itinerary legible.
 *
 * The map is a labelled placeholder rather than an embedded tile service: no
 * API key is wired up, and a broken or watermarked map would be worse than an
 * honest one.
 */
export function AirportInfo({ slice }: { slice: FlightSlice }) {
  const from = AIRPORTS_BY_CODE[slice.fromCode];
  const to = AIRPORTS_BY_CODE[slice.toCode];
  if (!from || !to) return null;

  const firstSegment = slice.segments[0];
  const lastSegment = slice.segments[slice.segments.length - 1];
  const difference = timeDifferenceLabel(from.utcOffsetMinutes, to.utcOffsetMinutes);

  return (
    <section
      aria-labelledby="airport-info-heading"
      className="rounded-card border border-line bg-surface p-5 shadow-card"
    >
      <h2 id="airport-info-heading" className="mb-4 text-base font-semibold text-ink">
        Airport information
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <AirportCard
          icon={<PlaneTakeoff className="size-4" aria-hidden="true" />}
          role="Departing from"
          code={from.code}
          name={from.name}
          city={from.city}
          country={from.country}
          timezone={from.timezone}
          offset={from.utcOffsetMinutes}
          terminal={firstSegment?.departTerminal}
          gate={firstSegment?.gate}
        />
        <AirportCard
          icon={<PlaneLanding className="size-4" aria-hidden="true" />}
          role="Arriving at"
          code={to.code}
          name={to.name}
          city={to.city}
          country={to.country}
          timezone={to.timezone}
          offset={to.utcOffsetMinutes}
          terminal={lastSegment?.arriveTerminal}
        />
      </div>

      {difference && (
        <p className="mt-4 flex items-start gap-2 rounded-field bg-primary-50 p-3 text-sm text-primary-700">
          <Clock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            {to.city} is <strong className="font-semibold">{difference}</strong> from{" "}
            {from.city}. All times shown are local to each airport — your journey takes{" "}
            <strong className="font-semibold">
              {Math.floor(slice.durationMinutes / 60)}h {slice.durationMinutes % 60}m
            </strong>{" "}
            regardless of the clocks.
          </span>
        </p>
      )}

      {/* Map placeholder — no tile provider is configured. */}
      <div
        role="img"
        aria-label={`Route map placeholder: ${from.city} to ${to.city}`}
        className="mt-4 grid h-40 place-items-center rounded-field border border-dashed border-line bg-surface-muted/60"
      >
        <div className="text-center">
          <Map className="mx-auto size-6 text-muted" aria-hidden="true" />
          <p className="mt-1.5 text-sm font-medium text-body">
            {from.code} → {to.code}
          </p>
          <p className="text-xs text-muted">
            Route map available once a map provider is connected
          </p>
        </div>
      </div>
    </section>
  );
}

function AirportCard({
  icon,
  role,
  code,
  name,
  city,
  country,
  timezone,
  offset,
  terminal,
  gate,
}: {
  icon: React.ReactNode;
  role: string;
  code: string;
  name: string;
  city: string;
  country: string;
  timezone: string;
  offset: number;
  terminal?: string;
  gate?: string;
}) {
  return (
    <div className="rounded-field border border-line p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
        {icon}
        {role}
      </p>
      <p className="mt-1.5 text-sm font-semibold text-ink">
        {city} <span className="font-normal text-muted">({code})</span>
      </p>
      <p className="text-sm text-body">{name}</p>
      <dl className="mt-3 space-y-1 text-xs text-muted">
        <div className="flex gap-1.5">
          <dt className="sr-only">Country</dt>
          <dd className="inline-flex items-center gap-1.5">
            <Globe2 className="size-3 shrink-0" aria-hidden="true" />
            {country}
          </dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="sr-only">Timezone</dt>
          <dd className="inline-flex items-center gap-1.5">
            <Clock className="size-3 shrink-0" aria-hidden="true" />
            {timezone} · {formatUtcOffset(offset)}
          </dd>
        </div>
        {terminal && (
          <div className="flex gap-1.5">
            <dt className="font-medium">Terminal:</dt>
            <dd>
              {terminal}
              {gate && ` · Gate ${gate}`}
            </dd>
          </div>
        )}
      </dl>
      {gate && (
        <p className="mt-2 text-xs text-muted">
          Gates are confirmed closer to departure — check the airport screens.
        </p>
      )}
    </div>
  );
}
