"use client";

import Link from "next/link";
import { TrendingDown } from "lucide-react";
import type { FarePricePoint, FlightSearchQuery } from "@/types/flight";
import { useLocale } from "@/features/i18n";
import { searchHref } from "../query-url";
import { cn } from "@/lib/utils";

interface PriceCalendarProps {
  points: FarePricePoint[];
  query: FlightSearchQuery;
}

/**
 * PriceCalendar — the ±3-day fare strip shown when "flexible dates" is on.
 *
 * Each day links to the same search shifted to that date, so exploring the
 * window costs one click and keeps a real URL. The outbound date moves and the
 * return moves with it, preserving trip length — shifting only the departure
 * would silently turn a 7-night trip into a 4-night one.
 */
export function PriceCalendar({ points, query }: PriceCalendarProps) {
  const { money, date } = useLocale();

  if (points.length === 0) return null;

  const current = query.legs[0]?.date;
  const max = Math.max(...points.map((p) => p.fromUsd));
  const min = Math.min(...points.map((p) => p.fromUsd));
  const span = Math.max(1, max - min);

  /** Shift the whole itinerary so every leg keeps its relative spacing. */
  const shiftedHref = (target: string) => {
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
  };

  return (
    <section
      aria-label="Fares on nearby dates"
      className="rounded-card border border-line bg-surface p-4"
    >
      <h2 className="mb-3 text-sm font-semibold text-ink">Fares on nearby dates</h2>
      <ul className="flex gap-2 overflow-x-auto pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden">
        {points.map((point) => {
          const active = point.date === current;
          // Bar height encodes relative price so the cheap days are scannable
          // without reading a single number.
          const heightPct = 30 + ((point.fromUsd - min) / span) * 70;

          return (
            <li key={point.date} className="min-w-[5.25rem] flex-1">
              <Link
                href={shiftedHref(point.date)}
                aria-current={active ? "date" : undefined}
                className={cn(
                  "flex h-full flex-col items-center gap-1.5 rounded-field border p-2 transition-colors",
                  active
                    ? "border-primary bg-primary-50"
                    : "border-line hover:border-primary/50",
                )}
              >
                <span className="text-[0.6875rem] font-medium text-muted">
                  {date(point.date, { weekday: "short", day: "numeric", month: "short" })}
                </span>
                <span className="flex h-10 w-full items-end justify-center" aria-hidden="true">
                  <span
                    className={cn(
                      "w-6 rounded-t-sm",
                      point.cheapest ? "bg-success" : active ? "bg-primary" : "bg-line",
                    )}
                    style={{ height: `${heightPct}%` }}
                  />
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 text-xs font-bold tabular-nums",
                    point.cheapest ? "text-success" : "text-ink",
                  )}
                >
                  {point.cheapest && (
                    <TrendingDown className="size-3 shrink-0" aria-hidden="true" />
                  )}
                  {money(point.fromUsd)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-muted">
        Indicative lowest fares. Prices are confirmed when you select a flight.
      </p>
    </section>
  );
}
