"use client";

import { Plane } from "lucide-react";
import type { FlightSlice } from "@/types/flight";
import { formatDuration, formatTime } from "@/lib/flight-time";
import { AIRPORTS_BY_CODE } from "@/lib/mock/airports";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface SliceSummaryProps {
  slice: FlightSlice;
  /** Denser type and a shorter stop line, for the results card. */
  compact?: boolean;
  className?: string;
}

/**
 * SliceSummary — the departure → arrival strip shown on every result card.
 *
 * The visual grammar most travellers already read: times at the ends, a line
 * between them, and the stop count on the line. Two details matter for
 * correctness:
 *
 *  - **`+1` day markers.** An arrival on the following calendar day is the single
 *    most misread thing on a flight result. It gets a superscript badge and an
 *    explicit screen-reader phrase, never just a different time.
 *  - **Times are the airport's local clock**, not the viewer's, so they're
 *    rendered from the stored local string and never passed through a
 *    timezone-converting formatter.
 */
export function SliceSummary({ slice, compact = false, className }: SliceSummaryProps) {
  const from = AIRPORTS_BY_CODE[slice.fromCode];
  const to = AIRPORTS_BY_CODE[slice.toCode];

  const stopLabel =
    slice.stops === 0
      ? "Non-stop"
      : `${slice.stops} stop${slice.stops > 1 ? "s" : ""}`;

  const stopDetail = slice.layovers
    .map((l) => `${l.airportCode} ${formatDuration(l.durationMinutes)}`)
    .join(" · ");

  return (
    <div className={cn("flex items-center gap-3 sm:gap-4", className)}>
      {/* Departure */}
      <div className="shrink-0 text-right">
        <p
          className={cn(
            "font-bold tabular-nums text-ink",
            compact ? "text-base" : "text-lg",
          )}
        >
          {formatTime(slice.departLocal)}
        </p>
        <p className="text-xs font-medium text-muted">{slice.fromCode}</p>
      </div>

      {/* Journey line */}
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-center text-[0.6875rem] text-muted">
          {formatDuration(slice.durationMinutes)}
        </p>
        <div className="relative flex items-center" aria-hidden="true">
          <span className="size-1.5 shrink-0 rounded-full bg-line" />
          <span className="h-px flex-1 bg-line" />
          <Plane className="size-3.5 shrink-0 rotate-90 text-primary" />
          <span className="h-px flex-1 bg-line" />
          <span className="size-1.5 shrink-0 rounded-full bg-line" />
        </div>
        <p
          className={cn(
            "mt-1 truncate text-center text-[0.6875rem]",
            slice.stops === 0 ? "font-medium text-success" : "text-muted",
          )}
        >
          {stopLabel}
          {!compact && stopDetail && ` · ${stopDetail}`}
        </p>
      </div>

      {/* Arrival */}
      <div className="shrink-0">
        <p
          className={cn(
            "font-bold tabular-nums text-ink",
            compact ? "text-base" : "text-lg",
          )}
        >
          {formatTime(slice.arriveLocal)}
          {slice.dayOffset > 0 && (
            <Tooltip content={`Arrives ${slice.dayOffset} day${slice.dayOffset > 1 ? "s" : ""} later`}>
              <sup className="ml-0.5 rounded-sm bg-accent-50 px-1 text-[0.625rem] font-bold text-accent-600">
                +{slice.dayOffset}
              </sup>
            </Tooltip>
          )}
        </p>
        <p className="text-xs font-medium text-muted">{slice.toCode}</p>
      </div>

      {/* One clear sentence for screen readers, instead of scattered fragments */}
      <span className="sr-only">
        Departs {from?.city ?? slice.fromCode} at {formatTime(slice.departLocal)}, arrives{" "}
        {to?.city ?? slice.toCode} at {formatTime(slice.arriveLocal)}
        {slice.dayOffset > 0
          ? ` on the following day${slice.dayOffset > 1 ? `s, ${slice.dayOffset} days later` : ""}`
          : ""}
        . Journey time {formatDuration(slice.durationMinutes)}, {stopLabel.toLowerCase()}
        {stopDetail ? ` via ${stopDetail}` : ""}.
      </span>
    </div>
  );
}
