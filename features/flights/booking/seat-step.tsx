"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Info, RotateCcw } from "lucide-react";
import type { FlightOffer, FlightPassenger, Seat, SeatMap } from "@/types/flight";
import { getSeatMaps } from "@/services/flight.service";
import { AIRPORTS_BY_CODE } from "@/lib/mock/airports";
import { useLocale } from "@/features/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Seat picks: `{ [segmentId]: { [passengerId]: seatId } }`. */
export type SeatAssignments = Record<string, Record<string, string>>;

interface SeatStepProps {
  offer: FlightOffer;
  passengers: FlightPassenger[];
  value: SeatAssignments;
  onChange: (next: SeatAssignments) => void;
  onBack: () => void;
  onNext: () => void;
}

/**
 * SeatStep — the interactive seat map, one segment at a time.
 *
 * Two decisions shape it:
 *
 *  - **Seats are per segment, not per booking.** A connecting itinerary is two
 *    different aircraft; offering one seat picker for both would assign a seat
 *    that doesn't exist on the second aircraft. The step therefore walks
 *    segments, and the total updates as picks accumulate.
 *  - **Skipping is a first-class outcome.** Seat selection is optional on every
 *    fare, and forcing a choice to proceed is a conversion tax. "Skip for now"
 *    is as prominent as continuing, and the airline assigns at check-in.
 *
 * Infants are excluded throughout: they travel on an adult's lap and have no
 * seat to assign.
 */
export function SeatStep({
  offer,
  passengers,
  value,
  onChange,
  onBack,
  onNext,
}: SeatStepProps) {
  const { money } = useLocale();
  const [maps, setMaps] = useState<SeatMap[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [activePassenger, setActivePassenger] = useState(0);

  const seated = passengers.filter((p) => p.type !== "infant");

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

  const map = maps?.[segmentIndex];

  /** Every seat picked across every segment, with its price. */
  const pickedSeats: Array<{ seat: Seat; map: SeatMap; passengerId: string }> = [];
  if (maps) {
    for (const m of maps) {
      const assignments = value[m.segmentId] ?? {};
      for (const [passengerId, seatId] of Object.entries(assignments)) {
        for (const row of m.rows) {
          const seat = row.seats.find((s) => s.id === seatId);
          if (seat) pickedSeats.push({ seat, map: m, passengerId });
        }
      }
    }
  }
  const seatsTotalUsd = pickedSeats.reduce((sum, p) => sum + p.seat.priceUsd, 0);

  const assignSeat = (seat: Seat) => {
    if (!map || seat.status !== "available") return;
    const passenger = seated[activePassenger];
    if (!passenger) return;

    const current = value[map.segmentId] ?? {};
    // A seat already held by someone else in this party is released to them.
    const withoutDuplicate = Object.fromEntries(
      Object.entries(current).filter(([, seatId]) => seatId !== seat.id),
    );

    onChange({
      ...value,
      [map.segmentId]: { ...withoutDuplicate, [passenger.id]: seat.id },
    });

    // Advance to the next traveller who still needs a seat on this segment.
    const nextUnseated = seated.findIndex(
      (p, i) => i > activePassenger && !withoutDuplicate[p.id],
    );
    if (nextUnseated >= 0) setActivePassenger(nextUnseated);
  };

  const clearSegment = () => {
    if (!map) return;
    const next = { ...value };
    delete next[map.segmentId];
    onChange(next);
    setActivePassenger(0);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2.5 rounded-card border border-line bg-surface p-4">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <p className="text-sm text-body">
          Seat selection is optional. Skip it and the airline will assign seats free of
          charge at check-in — though your party may not be seated together.
        </p>
      </div>

      {failed ? (
        <div className="rounded-card border border-line bg-surface p-8 text-center">
          <p className="text-sm text-body">
            The seat map isn&apos;t available for this flight. You can choose seats at
            check-in instead.
          </p>
        </div>
      ) : maps === null ? (
        <div className="space-y-3 rounded-card border border-line bg-surface p-5">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !map ? (
        <div className="rounded-card border border-line bg-surface p-8 text-center">
          <p className="text-sm text-body">Seats are assigned at check-in on this flight.</p>
        </div>
      ) : (
        <section className="rounded-card border border-line bg-surface shadow-card">
          {/* Segment switcher */}
          {maps.length > 1 && (
            <div className="flex gap-1 overflow-x-auto border-b border-line p-2 scrollbar-none [&::-webkit-scrollbar]:hidden">
              {maps.map((m, i) => {
                const picks = Object.keys(value[m.segmentId] ?? {}).length;
                return (
                  <button
                    key={m.segmentId}
                    type="button"
                    onClick={() => {
                      setSegmentIndex(i);
                      setActivePassenger(0);
                    }}
                    aria-pressed={i === segmentIndex}
                    className={cn(
                      "shrink-0 rounded-field px-3 py-2 text-sm font-medium transition-colors",
                      i === segmentIndex
                        ? "bg-primary-50 text-primary"
                        : "text-body hover:bg-surface-muted",
                    )}
                  >
                    {m.fromCode} → {m.toCode}
                    {picks > 0 && (
                      <span className="ml-1.5 text-xs text-muted">({picks})</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-ink">
                  {AIRPORTS_BY_CODE[map.fromCode]?.city ?? map.fromCode} →{" "}
                  {AIRPORTS_BY_CODE[map.toCode]?.city ?? map.toCode}
                </h2>
                <p className="text-sm text-muted">
                  {map.flightNumber} · {map.aircraftName}
                </p>
              </div>
              {Object.keys(value[map.segmentId] ?? {}).length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSegment}
                  leftIcon={<RotateCcw className="size-3.5" aria-hidden="true" />}
                >
                  Clear seats
                </Button>
              )}
            </div>

            {/* Who am I choosing for? */}
            <div className="mb-4 flex flex-wrap gap-2">
              {seated.map((passenger, i) => {
                const seatId = value[map.segmentId]?.[passenger.id];
                return (
                  <button
                    key={passenger.id}
                    type="button"
                    onClick={() => setActivePassenger(i)}
                    aria-pressed={i === activePassenger}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-pill border px-3.5 py-2 text-sm font-medium transition-colors",
                      i === activePassenger
                        ? "border-primary bg-primary-50 text-primary"
                        : "border-line text-body hover:border-primary/50",
                    )}
                  >
                    {passenger.firstName || `Traveller ${i + 1}`}
                    {seatId ? (
                      <Badge variant="primary" size="sm">
                        {seatId}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted">no seat</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* The cabin */}
            <div className="overflow-x-auto rounded-field bg-surface-muted/40 p-4">
              <div className="mx-auto w-fit">
                {/* Column letters */}
                <div className="mb-2 flex items-center gap-1.5">
                  <span className="w-6 shrink-0" aria-hidden="true" />
                  {map.columns.map((column) => (
                    <span
                      key={column}
                      className={cn(
                        "w-8 text-center text-xs font-medium text-muted",
                        map.aisleAfter.includes(column) && "me-6",
                      )}
                    >
                      {column}
                    </span>
                  ))}
                </div>

                {map.rows
                  .filter((row) => row.seats.some((s) => s.status !== "blocked"))
                  .map((row) => (
                    <div key={row.row} className="mb-1.5 flex items-center gap-1.5">
                      <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted">
                        {row.row}
                      </span>
                      {row.seats.map((seat) => (
                        <SeatButton
                          key={seat.id}
                          seat={seat}
                          selectedBy={Object.entries(value[map.segmentId] ?? {}).find(
                            ([, id]) => id === seat.id,
                          )?.[0]}
                          passengers={seated}
                          onSelect={() => assignSeat(seat)}
                          gap={map.aisleAfter.includes(seat.column)}
                          money={money}
                        />
                      ))}
                      {row.exitRow && (
                        <span className="ms-2 shrink-0 text-[0.625rem] font-medium uppercase tracking-wide text-accent-600">
                          Exit
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            {/* Legend */}
            <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
              <Legend className="border-line bg-surface" label="Free" />
              <Legend className="border-primary/40 bg-primary/15" label="Paid" />
              <Legend className="border-accent-400 bg-accent-100" label="Extra legroom" />
              <Legend className="border-line bg-line" label="Taken" />
              <Legend className="border-primary bg-primary" label="Your seat" />
            </ul>

            <p className="mt-3 text-xs text-muted">
              Exit-row seats require a passenger aged 16 or over who is able to assist in
              an evacuation. Cabin crew confirm eligibility at boarding.
            </p>
          </div>
        </section>
      )}

      {/* ---- Footer ------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="outline"
          size="md"
          onClick={onBack}
          leftIcon={<ArrowLeft className="size-4" aria-hidden="true" />}
        >
          Back
        </Button>

        <div className="flex items-center gap-3">
          {seatsTotalUsd > 0 && (
            <p className="text-sm text-body">
              Seats:{" "}
              <span className="font-semibold text-ink">{money(seatsTotalUsd)}</span>
            </p>
          )}
          {pickedSeats.length === 0 ? (
            <Button variant="primary" size="lg" onClick={onNext}>
              Skip for now
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          ) : (
            <Button variant="primary" size="lg" onClick={onNext}>
              Continue to extras
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SeatButton({
  seat,
  selectedBy,
  passengers,
  onSelect,
  gap,
  money,
}: {
  seat: Seat;
  selectedBy?: string;
  passengers: FlightPassenger[];
  onSelect: () => void;
  gap: boolean;
  money: (usd: number) => string;
}) {
  if (seat.status === "blocked") {
    return <span className={cn("size-8 shrink-0", gap && "me-6")} aria-hidden="true" />;
  }

  const taken = seat.status === "occupied";
  const selected = Boolean(selectedBy);
  const holder = selectedBy
    ? passengers.find((p) => p.id === selectedBy)?.firstName
    : undefined;

  const label = taken
    ? `Seat ${seat.id}, unavailable`
    : selected
      ? `Seat ${seat.id}, selected for ${holder ?? "you"}`
      : `Seat ${seat.id}, ${seat.kind}${seat.extraLegroom ? ", extra legroom" : ""}, ${
          seat.priceUsd > 0 ? money(seat.priceUsd) : "free"
        }`;

  return (
    <button
      type="button"
      disabled={taken}
      onClick={onSelect}
      aria-label={label}
      aria-pressed={selected}
      title={label}
      className={cn(
        "size-8 shrink-0 rounded-t-md border text-[0.625rem] font-semibold transition-colors",
        gap && "me-6",
        taken && "cursor-not-allowed border-line bg-line text-transparent",
        !taken && selected && "border-primary bg-primary text-white",
        !taken &&
          !selected &&
          seat.extraLegroom &&
          "border-accent-400 bg-accent-100 text-accent-700 hover:border-accent-600",
        !taken &&
          !selected &&
          !seat.extraLegroom &&
          seat.priceUsd > 0 &&
          "border-primary/40 bg-primary/15 text-primary hover:border-primary",
        !taken &&
          !selected &&
          !seat.extraLegroom &&
          seat.priceUsd === 0 &&
          "border-line bg-surface text-muted hover:border-primary",
      )}
    >
      {selected ? seat.column : ""}
    </button>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <li className="inline-flex items-center gap-1.5">
      <span className={cn("size-4 rounded-t-sm border", className)} aria-hidden="true" />
      {label}
    </li>
  );
}
