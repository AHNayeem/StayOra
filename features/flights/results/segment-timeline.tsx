"use client";

import {
  Clock,
  MoonStar,
  PlaneLanding,
  PlaneTakeoff,
  TriangleAlert,
  Wifi,
  Tv,
  Zap,
} from "lucide-react";
import type { FlightSlice } from "@/types/flight";
import { formatDuration, formatTime } from "@/lib/flight-time";
import { AIRPORTS_BY_CODE } from "@/lib/mock/airports";
import { AIRCRAFT_BY_CODE, AIRLINES_BY_CODE } from "@/lib/mock/airlines";
import { CABIN_LABEL } from "@/lib/mock/fares";
import { cn } from "@/lib/utils";
import { AirlineLogo } from "../airline-logo";

/** A layover this long is worth flagging, not just stating. */
const TIGHT_CONNECTION_MINUTES = 75;
const LONG_CONNECTION_MINUTES = 300;

interface SegmentTimelineProps {
  slice: FlightSlice;
  /** Fade in each row as it mounts — used on the details page. */
  animated?: boolean;
  className?: string;
}

/**
 * SegmentTimeline — the segment-by-segment breakdown of one journey.
 *
 * Rendered as a vertical timeline because that's the shape of the information:
 * events in sequence, with waiting in between. Connections get their own row
 * rather than a footnote, and short or overnight ones are called out — a 55-
 * minute transfer at a large hub is a real risk and the traveller should see it
 * before they book, not after they miss it.
 */
export function SegmentTimeline({
  slice,
  animated = false,
  className,
}: SegmentTimelineProps) {
  return (
    <ol className={cn("relative space-y-0", className)}>
      {slice.segments.map((segment, index) => {
        const from = AIRPORTS_BY_CODE[segment.fromCode];
        const to = AIRPORTS_BY_CODE[segment.toCode];
        const aircraft = AIRCRAFT_BY_CODE[segment.aircraftCode];
        const airline = AIRLINES_BY_CODE[segment.airlineCode];
        const layover = slice.layovers[index];

        return (
          <li
            key={segment.id}
            className={cn(animated && "animate-slide-in-bottom")}
            style={animated ? { animationDelay: `${index * 90}ms` } : undefined}
          >
            {/* ---- Departure ------------------------------------------------ */}
            <TimelineRow
              icon={<PlaneTakeoff className="size-4" aria-hidden="true" />}
              time={formatTime(segment.departLocal)}
              connector
            >
              <p className="text-sm font-semibold text-ink">
                {from?.city ?? segment.fromCode}{" "}
                <span className="font-normal text-muted">({segment.fromCode})</span>
              </p>
              <p className="text-xs text-muted">
                {from?.name}
                {segment.departTerminal && ` · ${segment.departTerminal}`}
                {segment.gate && ` · Gate ${segment.gate}`}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Boarding {formatTime(segment.boardingLocal)}
              </p>
            </TimelineRow>

            {/* ---- In flight ------------------------------------------------ */}
            <div className="flex gap-4 py-1">
              <span className="w-12 shrink-0" aria-hidden="true" />
              <span
                className="relative flex w-4 shrink-0 justify-center"
                aria-hidden="true"
              >
                <span className="h-full w-px border-l-2 border-dashed border-line" />
              </span>
              <div className="min-w-0 flex-1 rounded-field bg-surface px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-2">
                    <AirlineLogo code={segment.airlineCode} size="xs" />
                    <span className="text-xs font-semibold text-ink">
                      {segment.flightNumber}
                    </span>
                  </span>
                  <span className="text-xs text-muted">
                    {airline?.name ?? segment.airlineCode}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted">
                    <Clock className="size-3" aria-hidden="true" />
                    {formatDuration(segment.durationMinutes)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {aircraft?.name ?? segment.aircraftCode} · {CABIN_LABEL[segment.cabin]} ·{" "}
                  {segment.distanceKm.toLocaleString()} km · {segment.co2Kg} kg CO₂
                </p>
                {aircraft && (
                  <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[0.6875rem] text-muted">
                    {aircraft.hasWifi && (
                      <li className="inline-flex items-center gap-1">
                        <Wifi className="size-3" aria-hidden="true" /> Wi-Fi
                      </li>
                    )}
                    {aircraft.hasEntertainment && (
                      <li className="inline-flex items-center gap-1">
                        <Tv className="size-3" aria-hidden="true" /> Entertainment
                      </li>
                    )}
                    {aircraft.hasPower && (
                      <li className="inline-flex items-center gap-1">
                        <Zap className="size-3" aria-hidden="true" /> Power outlet
                      </li>
                    )}
                    <li>{aircraft.seatPitchInches}&quot; seat pitch</li>
                  </ul>
                )}
              </div>
            </div>

            {/* ---- Arrival -------------------------------------------------- */}
            <TimelineRow
              icon={<PlaneLanding className="size-4" aria-hidden="true" />}
              time={formatTime(segment.arriveLocal)}
              connector={Boolean(layover)}
            >
              <p className="text-sm font-semibold text-ink">
                {to?.city ?? segment.toCode}{" "}
                <span className="font-normal text-muted">({segment.toCode})</span>
              </p>
              <p className="text-xs text-muted">
                {to?.name}
                {segment.arriveTerminal && ` · ${segment.arriveTerminal}`}
              </p>
            </TimelineRow>

            {/* ---- Connection ----------------------------------------------- */}
            {layover && (
              <div className="flex gap-4 py-1">
                <span className="w-12 shrink-0" aria-hidden="true" />
                <span
                  className="relative flex w-4 shrink-0 justify-center"
                  aria-hidden="true"
                >
                  <span className="h-full w-px border-l-2 border-dashed border-line" />
                </span>
                <div
                  className={cn(
                    "min-w-0 flex-1 rounded-field border px-3 py-2",
                    layover.durationMinutes < TIGHT_CONNECTION_MINUTES ||
                      layover.changeOfAirport
                      ? "border-danger/30 bg-danger/5"
                      : "border-line bg-surface-muted/60",
                  )}
                >
                  <p className="flex flex-wrap items-center gap-x-2 text-xs font-medium text-ink">
                    <Clock className="size-3.5 shrink-0 text-muted" aria-hidden="true" />
                    {formatDuration(layover.durationMinutes)} connection in{" "}
                    {AIRPORTS_BY_CODE[layover.airportCode]?.city ?? layover.airportCode}
                    {layover.overnight && (
                      <span className="inline-flex items-center gap-1 text-muted">
                        <MoonStar className="size-3" aria-hidden="true" />
                        overnight
                      </span>
                    )}
                  </p>
                  {layover.changeOfAirport && (
                    <p className="mt-1 flex items-start gap-1.5 text-xs text-danger">
                      <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                      You&apos;ll need to change airports and re-check your bags.
                    </p>
                  )}
                  {!layover.changeOfAirport &&
                    layover.durationMinutes < TIGHT_CONNECTION_MINUTES && (
                      <p className="mt-1 flex items-start gap-1.5 text-xs text-danger">
                        <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                        Short connection — any delay puts this transfer at risk.
                      </p>
                    )}
                  {layover.durationMinutes > LONG_CONNECTION_MINUTES && (
                    <p className="mt-1 text-xs text-muted">
                      Long layover — enough time to leave the airport if you have transit
                      rights.
                    </p>
                  )}
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** One event row: time gutter, node + connector, and the detail column. */
function TimelineRow({
  icon,
  time,
  connector,
  children,
}: {
  icon: React.ReactNode;
  time: string;
  connector: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <span className="w-12 shrink-0 pt-0.5 text-right text-sm font-semibold tabular-nums text-ink">
        {time}
      </span>
      <span className="relative flex w-4 shrink-0 flex-col items-center">
        <span className="grid size-4 shrink-0 place-items-center rounded-full bg-primary text-white [&>svg]:size-2.5">
          {icon}
        </span>
        {connector && <span className="w-px flex-1 bg-line" aria-hidden="true" />}
      </span>
      <div className="min-w-0 flex-1 pb-1">{children}</div>
    </div>
  );
}
