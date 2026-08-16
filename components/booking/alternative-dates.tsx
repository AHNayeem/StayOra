"use client";

import { CalendarRange, TrendingDown } from "lucide-react";
import type { AlternativeDate } from "@/features/dashboard/domain/alternatives";
import { useLocale } from "@/features/i18n";
import { Button } from "@/components/ui/button";

/**
 * Nearby dates that are free (or cheaper).
 *
 * Shown in two situations: when the requested dates are sold out — instead of
 * ending the journey at "not available" — and when a nearby window costs less,
 * which is a saving for the traveller and a filled night for the property.
 */
export function AlternativeDates({
  options,
  soldOut,
  onPick,
}: {
  options: AlternativeDate[];
  soldOut: boolean;
  onPick: (option: AlternativeDate) => void;
}) {
  const { money, date } = useLocale();
  if (options.length === 0) return null;

  return (
    <div className="mt-5 rounded-card border border-line bg-surface p-5">
      <div className="flex items-center gap-2">
        {soldOut ? (
          <CalendarRange className="size-4 text-primary" aria-hidden="true" />
        ) : (
          <TrendingDown className="size-4 text-primary" aria-hidden="true" />
        )}
        <h3 className="text-sm font-semibold text-ink">
          {soldOut ? "These dates are free" : "Cheaper nearby dates"}
        </h3>
      </div>
      <p className="mt-1 text-sm text-muted">
        {soldOut
          ? "Your dates are taken, but the same room is available just before or after."
          : "Shifting your stay by a few days costs less for the same room."}
      </p>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {options.map((option) => (
          <li
            key={`${option.checkIn}-${option.checkOut}`}
            className="flex items-center justify-between gap-3 rounded-field border border-line px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">
                {date(`${option.checkIn}T00:00:00.000Z`)} →{" "}
                {date(`${option.checkOut}T00:00:00.000Z`)}
              </p>
              <p className="text-xs text-muted">
                {money(option.total)} · {option.nights} night{option.nights === 1 ? "" : "s"}
                {option.savingVsRequested > 0 && (
                  <span className="ml-1 font-medium text-primary">
                    save {money(option.savingVsRequested)}
                  </span>
                )}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => onPick(option)}>
              Choose
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
