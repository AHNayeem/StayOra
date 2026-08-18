"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { CalendarRange, ChevronLeft, ChevronRight, TrendingDown } from "lucide-react";
import type { FarePricePoint, FlightSearchQuery } from "@/types/flight";
import { getPriceCalendar } from "@/services/flight.service";
import { addDays } from "@/lib/flight-time";
import { useLocale } from "@/features/i18n";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { searchHref } from "../query-url";
import { cn } from "@/lib/utils";

interface PriceCalendarProps {
  points: FarePricePoint[];
  query: FlightSearchQuery;
}

/**
 * PriceCalendar — the fare strip above the results.
 *
 * Three things make it a working filter rather than a decoration:
 *
 *  1. **Every day is a link** to the same search shifted to that date, so
 *     exploring the window costs one click and keeps a real, shareable URL. The
 *     outbound date moves and the return moves with it, preserving trip length —
 *     shifting only the departure would silently turn a 7-night trip into a
 *     4-night one.
 *  2. **The arrows page the window** through {@link getPriceCalendar} instead of
 *     re-running the search. Looking at next week's fares shouldn't tear down
 *     the results you're already reading; only picking a day does that.
 *  3. **"Explore fares" opens the month**, for travellers whose dates are open
 *     wider than a strip can show.
 *
 * Prices are a pure function of (route, date, cabin), so a day priced here and
 * the same day priced by the next search always agree.
 */
export function PriceCalendar({ points: serverPoints, query }: PriceCalendarProps) {
  const { date } = useLocale();

  const [points, setPoints] = useState(serverPoints);
  const [pending, setPending] = useState(false);
  const [exploring, setExploring] = useState(false);
  const today = useToday();

  // Only the newest window may write to state — paging fast would otherwise let
  // a slow earlier response land last and show the wrong week.
  const request = useRef(0);

  if (points.length === 0) return null;

  const current = query.legs[0]?.date;
  const start = points[0].date;
  const span = points.length;
  // Fares in the past aren't bookable, so the strip stops at today.
  const atFloor = today !== null && start <= today;

  const load = async (startDate: string, days: number) => {
    const id = (request.current += 1);
    setPending(true);
    const next = await getPriceCalendar(query, { startDate, days });
    if (id !== request.current) return;
    if (next.length > 0) setPoints(next);
    setPending(false);
  };

  const page = (direction: -1 | 1) => {
    let target = addDays(start, direction * span);
    if (today && target < today) target = today;
    if (target === start) return;
    void load(target, span);
  };

  return (
    <>
      <section
        aria-label="Fares on nearby dates"
        className="rounded-card border border-line bg-surface p-3"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
          <div className="flex min-w-0 flex-1 items-center gap-1 md:gap-2">
            <ArrowButton
              direction="prev"
              label={`Show the ${span} days before ${date(start, { day: "numeric", month: "short" })}`}
              onClick={() => page(-1)}
              disabled={pending || atFloor}
            />

            <ul
              className="flex flex-1 gap-1 overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden"
              aria-busy={pending}
            >
              {points.map((point) => (
                <li key={point.date} className="min-w-[5.5rem] flex-1">
                  <DayCell
                    point={point}
                    active={point.date === current}
                    query={query}
                    dim={pending}
                  />
                </li>
              ))}
            </ul>

            <ArrowButton
              direction="next"
              label={`Show the ${span} days after ${date(points[span - 1].date, { day: "numeric", month: "short" })}`}
              onClick={() => page(1)}
              disabled={pending}
            />
          </div>

          <div className="flex items-center justify-center border-line md:border-l md:pl-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExploring(true)}
              leftIcon={<CalendarRange className="size-4" aria-hidden="true" />}
              className="text-primary"
            >
              Explore fares
            </Button>
          </div>
        </div>

        <p className="mt-2 text-center text-xs text-muted md:text-left">
          Indicative lowest fares{pending && " · updating"}. Prices are confirmed when
          you select a flight.
        </p>
      </section>

      {exploring && (
        <FareMonthDialog
          query={query}
          anchor={current ?? start}
          today={today}
          onClose={() => setExploring(false)}
        />
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Strip pieces                                                               */
/* -------------------------------------------------------------------------- */

function DayCell({
  point,
  active,
  query,
  dim,
}: {
  point: FarePricePoint;
  active: boolean;
  query: FlightSearchQuery;
  dim: boolean;
}) {
  const { money, date } = useLocale();

  return (
    <Link
      href={shiftedHref(query, point.date)}
      aria-current={active ? "date" : undefined}
      className={cn(
        "flex h-full flex-col items-center gap-1 rounded-field px-2 pt-2 pb-1 transition-colors",
        active ? "bg-primary-50" : "hover:bg-surface-muted",
        dim && "opacity-50",
      )}
    >
      <span
        className={cn(
          "text-[0.6875rem] font-medium whitespace-nowrap",
          active ? "text-primary" : "text-muted",
        )}
      >
        {date(point.date, { weekday: "short", day: "numeric", month: "short" })}
      </span>
      <span
        className={cn(
          "inline-flex items-center gap-0.5 text-sm tabular-nums",
          active ? "font-bold text-primary" : "font-semibold text-ink",
          point.cheapest && !active && "text-success",
        )}
      >
        {point.cheapest && <TrendingDown className="size-3 shrink-0" aria-hidden="true" />}
        {money(point.fromUsd)}
      </span>
      {/* The selected day carries the underline from the reference strip. */}
      <span
        aria-hidden="true"
        className={cn(
          "h-1 w-10 rounded-full",
          active ? "bg-accent-500" : "bg-transparent",
        )}
      />
    </Link>
  );
}

function ArrowButton({
  direction,
  label,
  onClick,
  disabled,
}: {
  direction: "prev" | "next";
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-muted text-ink transition-colors hover:bg-primary-50 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-40"
    >
      <Icon className="size-5" aria-hidden="true" />
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Month view                                                                 */
/* -------------------------------------------------------------------------- */

/** A known Sunday-to-Saturday week, used to label the grid in the active locale. */
const WEEK_HEADINGS = ["04", "05", "06", "07", "08", "09", "10"].map(
  (day) => `2026-01-${day}`,
);

/**
 * FareMonthDialog — "Explore fares" as a month grid.
 *
 * Same pricing call as the strip, one month at a time, so a traveller with open
 * dates can see where the cheap week actually is instead of paging a week at a
 * time to find it.
 */
function FareMonthDialog({
  query,
  anchor,
  today,
  onClose,
}: {
  query: FlightSearchQuery;
  anchor: string;
  today: string | null;
  onClose: () => void;
}) {
  const { money, date } = useLocale();
  const [month, setMonth] = useState(() => monthStart(anchor));
  // The loaded month travels with its fares, so "still loading" is simply
  // "what's loaded isn't the month being shown" — no second state to keep in
  // step, and no stale month's prices under a new month's heading.
  const [loaded, setLoaded] = useState<{ month: string; points: FarePricePoint[] } | null>(
    null,
  );

  useEffect(() => {
    let live = true;
    getPriceCalendar(query, { startDate: month, days: daysInMonth(month) }).then(
      (result) => {
        if (live) setLoaded({ month, points: result });
      },
    );
    return () => {
      live = false;
    };
  }, [query, month]);

  const loading = loaded?.month !== month;
  const points = loaded?.month === month ? loaded.points : [];

  const current = query.legs[0]?.date;
  const atFloor = today !== null && month <= monthStart(today);
  const leadingBlanks = new Date(`${month}T00:00:00Z`).getUTCDay();

  return (
    <Modal
      open
      onClose={onClose}
      title="Explore fares"
      description={`Lowest indicative fare per departure day · ${query.legs[0]?.from} → ${query.legs[query.legs.length - 1]?.to}`}
      size="xl"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <ArrowButton
          direction="prev"
          label="Previous month"
          onClick={() => setMonth(shiftMonth(month, -1))}
          disabled={loading || atFloor}
        />
        <p className="text-sm font-semibold text-ink">
          {date(month, { month: "long", year: "numeric" })}
        </p>
        <ArrowButton
          direction="next"
          label="Next month"
          onClick={() => setMonth(shiftMonth(month, 1))}
          disabled={loading}
        />
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[0.6875rem] font-medium text-muted">
        {WEEK_HEADINGS.map((day) => (
          <span key={day}>{date(day, { weekday: "short" })}</span>
        ))}
      </div>

      {loading ? (
        <div className="grid h-64 place-items-center">
          <Spinner />
        </div>
      ) : (
        <div className="mt-1 grid grid-cols-7 gap-1">
          {Array.from({ length: leadingBlanks }, (_, i) => (
            <span key={`blank-${i}`} aria-hidden="true" />
          ))}
          {points.map((point) => {
            const past = today !== null && point.date < today;
            const active = point.date === current;

            const inner = (
              <>
                <span className="text-xs text-muted">{Number(point.date.slice(8))}</span>
                <span
                  className={cn(
                    "text-[0.6875rem] font-semibold tabular-nums",
                    point.cheapest ? "text-success" : "text-ink",
                  )}
                >
                  {money(point.fromUsd)}
                </span>
              </>
            );

            const shell =
              "flex h-14 flex-col items-center justify-center gap-0.5 rounded-field border p-1 text-center";

            return past ? (
              <span
                key={point.date}
                className={cn(shell, "border-transparent opacity-40")}
                aria-disabled="true"
              >
                {inner}
              </span>
            ) : (
              <Link
                key={point.date}
                href={shiftedHref(query, point.date)}
                onClick={onClose}
                aria-current={active ? "date" : undefined}
                className={cn(
                  shell,
                  "transition-colors",
                  active
                    ? "border-primary bg-primary-50"
                    : point.cheapest
                      ? "border-success/40 bg-success/5 hover:border-success"
                      : "border-line hover:border-primary/50",
                )}
              >
                {inner}
              </Link>
            );
          })}
        </div>
      )}

      <p className="mt-3 text-xs text-muted">
        Indicative lowest fares for a {query.tripType === "round-trip" ? "round trip" : "one-way"} in{" "}
        {query.cabin.replace("-", " ")}. Picking a day keeps your trip length and re-runs
        the search.
      </p>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Shift the whole itinerary so every leg keeps its relative spacing. */
function shiftedHref(query: FlightSearchQuery, target: string): string {
  const origin = query.legs[0]?.date;
  if (!origin) return "#";
  const offsetMs = Date.parse(`${target}T00:00:00Z`) - Date.parse(`${origin}T00:00:00Z`);
  return searchHref({
    ...query,
    legs: query.legs.map((leg) => ({
      ...leg,
      date: new Date(Date.parse(`${leg.date}T00:00:00Z`) + offsetMs)
        .toISOString()
        .slice(0, 10),
    })),
  });
}

function monthStart(isoDate: string): string {
  return `${isoDate.slice(0, 7)}-01`;
}

function daysInMonth(isoDate: string): number {
  const [year, month] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function shiftMonth(isoDate: string, delta: number): string {
  const [year, month] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + delta, 1)).toISOString().slice(0, 10);
}

/**
 * Today, as the browser sees it — client-only by construction.
 *
 * The server's clock and the traveller's can straddle midnight, so a date baked
 * into the server render would hydrate into a mismatch. The server snapshot is
 * `null`; until the client one lands the strip simply doesn't clamp, which
 * costs nothing.
 */
function useToday(): string | null {
  return useSyncExternalStore(subscribeNever, localToday, () => null);
}

/** The clock never "changes" for our purposes — a page open past midnight can keep yesterday. */
const subscribeNever = () => () => {};

function localToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
