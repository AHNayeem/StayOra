"use client";

import { useEffect, useState } from "react";
import { Armchair, Loader2 } from "lucide-react";
import type { FlightOffer, SeatMap } from "@/types/flight";
import { getSeatMaps } from "@/services/flight.service";
import { useLocale } from "@/features/i18n";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * SeatMapPreview — a read-only glimpse of the cabin on the details page.
 *
 * Deliberately not interactive here. Choosing seats before you've entered
 * passenger names produces an assignment with nobody to assign it to, so
 * selection lives in the booking flow; this panel exists to answer "what does
 * the cabin look like and what will a good seat cost me" *before* committing.
 *
 * Loads lazily through the service on mount, because a seat map is a real
 * network call in production and shouldn't block the page it sits on.
 */
export function SeatMapPreview({ offer }: { offer: FlightOffer }) {
  const { money } = useLocale();
  const [maps, setMaps] = useState<SeatMap[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSeatMaps(offer.id)
      .then((result) => {
        if (!cancelled) setMaps(result);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [offer.id]);

  const map = maps?.[0];

  // Summarise what's actually buyable, from the map itself rather than guesses.
  const selectable = map
    ? map.rows.flatMap((r) => r.seats).filter((s) => s.status !== "blocked")
    : [];
  const available = selectable.filter((s) => s.status === "available");
  const freeSeats = available.filter((s) => s.priceUsd === 0).length;
  const paidPrices = available.filter((s) => s.priceUsd > 0).map((s) => s.priceUsd);
  const extraLegroom = available.filter((s) => s.extraLegroom).length;

  return (
    <section
      aria-labelledby="seatmap-heading"
      className="rounded-card border border-line bg-surface p-5 shadow-card"
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 id="seatmap-heading" className="text-base font-semibold text-ink">
          Seat selection
        </h2>
        {maps === null && !failed && (
          <Loader2 className="size-4 animate-spin text-muted" aria-hidden="true" />
        )}
      </div>

      {failed ? (
        <p className="rounded-field bg-surface-muted/60 p-4 text-sm text-body">
          The seat map isn&apos;t available right now. You&apos;ll be able to choose seats
          during booking, or at check-in.
        </p>
      ) : maps === null ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : !map ? (
        <p className="rounded-field bg-surface-muted/60 p-4 text-sm text-body">
          Seats on this flight are assigned at check-in.
        </p>
      ) : (
        <>
          <p className="text-sm text-body">
            {map.aircraftName} · {map.flightNumber} ({map.fromCode} → {map.toCode})
          </p>

          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Seats available" value={String(available.length)} />
            <Stat label="Free seats" value={freeSeats > 0 ? String(freeSeats) : "None"} />
            <Stat
              label="Paid seats from"
              value={paidPrices.length ? money(Math.min(...paidPrices)) : "—"}
            />
            <Stat label="Extra legroom" value={String(extraLegroom)} />
          </dl>

          {/* Miniature cabin view — a density map, not a selectable grid. */}
          <div className="mt-4 overflow-x-auto rounded-field border border-line bg-surface-muted/40 p-3">
            <div className="mx-auto w-fit space-y-1">
              {map.rows
                .filter((row) => row.seats.some((s) => s.status !== "blocked"))
                .slice(0, 14)
                .map((row) => (
                  <div key={row.row} className="flex items-center gap-1">
                    <span className="w-5 shrink-0 text-right text-[0.5625rem] tabular-nums text-muted">
                      {row.row}
                    </span>
                    {row.seats.map((seat) => (
                      <span
                        key={seat.id}
                        title={`${seat.id} · ${seat.kind}${seat.priceUsd ? ` · ${money(seat.priceUsd)}` : " · free"}`}
                        className={cn(
                          "size-3 rounded-[2px]",
                          seat.status === "occupied"
                            ? "bg-line"
                            : seat.extraLegroom
                              ? "bg-accent-400"
                              : seat.priceUsd > 0
                                ? "bg-primary/60"
                                : "bg-primary/25",
                          map.aisleAfter.includes(seat.column) && "me-2",
                        )}
                      />
                    ))}
                  </div>
                ))}
            </div>
          </div>

          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
            <Legend className="bg-primary/25" label="Free" />
            <Legend className="bg-primary/60" label="Paid" />
            <Legend className="bg-accent-400" label="Extra legroom" />
            <Legend className="bg-line" label="Taken" />
          </ul>

          <p className="mt-3 text-xs text-muted">
            Choose your exact seats in the next step, after entering traveller details.
          </p>
        </>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-field border border-line p-3">
      <dt className="flex items-center gap-1.5 text-xs text-muted">
        <Armchair className="size-3.5 shrink-0" aria-hidden="true" />
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <li className="inline-flex items-center gap-1.5">
      <span className={cn("size-3 rounded-[2px]", className)} aria-hidden="true" />
      {label}
    </li>
  );
}
