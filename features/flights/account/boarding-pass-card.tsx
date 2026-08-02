"use client";

import { Clock, DoorOpen, Sofa, Zap } from "lucide-react";
import type { BoardingPass } from "@/types/flight";
import { AIRPORTS_BY_CODE } from "@/lib/mock/airports";
import { CABIN_SHORT_LABEL } from "@/lib/mock/fares";
import { barcodeBars } from "@/lib/mock/boarding-pass";
import { formatTime } from "@/lib/flight-time";
import { useLocale } from "@/features/i18n";
import { Badge } from "@/components/ui/badge";
import { AirlineLogo } from "../airline-logo";

/**
 * BoardingPassCard — a printable-looking boarding pass.
 *
 * The barcode is an honest placeholder: it renders the BCBP-style payload as
 * varying bars so each pass looks distinct, and the card says plainly that it
 * won't scan at a gate. Rendering something that *looks* scannable but isn't
 * would be worse than useless at an airport, so the limitation is stated on the
 * card rather than hidden in a footnote.
 */
export function BoardingPassCard({ pass }: { pass: BoardingPass }) {
  const { date } = useLocale();
  const from = AIRPORTS_BY_CODE[pass.fromCode];
  const to = AIRPORTS_BY_CODE[pass.toCode];
  const bars = barcodeBars(pass.barcodeData);

  return (
    <article className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 bg-ink px-5 py-3 text-white">
        <div className="flex min-w-0 items-center gap-2.5">
          <AirlineLogo code={pass.airlineCode} size="sm" />
          <span className="min-w-0">
            <span className="block text-sm font-semibold">{pass.flightNumber}</span>
            <span className="block text-xs text-white/70">
              {date(pass.departLocal.slice(0, 10), { dateStyle: "medium" })}
            </span>
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {pass.fastTrack && (
            <Badge variant="accent" size="sm" className="bg-accent-500 text-white">
              <Zap className="size-3" aria-hidden="true" />
              Fast track
            </Badge>
          )}
          <Badge variant="dark" size="sm" className="bg-white/15 text-white">
            {CABIN_SHORT_LABEL[pass.cabin]}
          </Badge>
        </div>
      </div>

      {/* Route */}
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-none text-ink">{pass.fromCode}</p>
          <p className="mt-1 truncate text-xs text-muted">{from?.city}</p>
          <p className="mt-2 text-lg font-bold tabular-nums text-ink">
            {formatTime(pass.departLocal)}
          </p>
        </div>
        <div className="flex-1 border-t-2 border-dashed border-line" aria-hidden="true" />
        <div className="min-w-0 text-right">
          <p className="text-2xl font-bold leading-none text-ink">{pass.toCode}</p>
          <p className="mt-1 truncate text-xs text-muted">{to?.city}</p>
        </div>
      </div>

      {/* Passenger + seat details */}
      <dl className="grid grid-cols-2 gap-4 border-t border-dashed border-line px-5 py-4 sm:grid-cols-4">
        <div className="col-span-2">
          <dt className="text-[0.625rem] uppercase tracking-wide text-muted">Passenger</dt>
          <dd className="truncate text-sm font-semibold uppercase text-ink">
            {pass.passengerName}
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-[0.625rem] uppercase tracking-wide text-muted">
            <Sofa className="size-3" aria-hidden="true" />
            Seat
          </dt>
          <dd className="text-sm font-bold text-ink">{pass.seat}</dd>
        </div>
        <div>
          <dt className="text-[0.625rem] uppercase tracking-wide text-muted">Zone</dt>
          <dd className="text-sm font-semibold text-ink">{pass.zone}</dd>
        </div>
        <div>
          <dt className="text-[0.625rem] uppercase tracking-wide text-muted">Terminal</dt>
          <dd className="text-sm font-semibold text-ink">{pass.terminal}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-[0.625rem] uppercase tracking-wide text-muted">
            <DoorOpen className="size-3" aria-hidden="true" />
            Gate
          </dt>
          <dd className="text-sm font-semibold text-ink">{pass.gate}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-[0.625rem] uppercase tracking-wide text-muted">
            <Clock className="size-3" aria-hidden="true" />
            Boarding
          </dt>
          <dd className="text-sm font-bold text-ink">{formatTime(pass.boardingLocal)}</dd>
        </div>
        <div>
          <dt className="text-[0.625rem] uppercase tracking-wide text-muted">Seq</dt>
          <dd className="text-sm font-semibold text-ink">{pass.sequence}</dd>
        </div>
      </dl>

      {/* Barcode */}
      <div className="border-t border-dashed border-line bg-surface-muted/40 px-5 py-4">
        <div
          className="flex h-16 items-end justify-center gap-px overflow-hidden"
          role="img"
          aria-label={`Barcode placeholder for booking ${pass.pnr}`}
        >
          {bars.map((width, i) => (
            <span
              key={i}
              className="h-full bg-ink"
              style={{ width: `${width}px` }}
              aria-hidden="true"
            />
          ))}
        </div>
        <p className="mt-2 text-center font-mono text-[0.625rem] text-muted">
          {pass.pnr} · {pass.bookingReference}
        </p>
        <p className="mt-1 text-center text-[0.625rem] text-muted">
          Demo barcode — not scannable. Collect your printed pass at the airport or use
          the airline&apos;s app.
        </p>
      </div>
    </article>
  );
}
