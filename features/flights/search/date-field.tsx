"use client";

import { useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  addMonths,
  formatDisplayDate,
  fromISODate,
  startOfDay,
  startOfMonth,
  toISODate,
} from "@/lib/date";
import { useClickOutside } from "@/hooks/use-click-outside";
import { MonthGrid } from "@/features/search/date-range-picker";
import { cn } from "@/lib/utils";

interface DateFieldProps {
  label: string;
  /** ISO `YYYY-MM-DD`, or "" when unset. */
  value: string;
  onChange: (iso: string) => void;
  /** Earliest selectable date (ISO). Defaults to today. */
  min?: string;
  /** Rendered as a hint under the field, e.g. "Return" on a one-way. */
  hint?: string;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
  className?: string;
}

/**
 * DateField — single-date picker built on the same {@link MonthGrid} the stay
 * search uses, so calendars look and behave identically across the platform.
 *
 * `today` is read inside the component rather than at module scope: the popover
 * only renders after a click, which is necessarily client-side, so there's no
 * SSR/client mismatch to worry about.
 */
export function DateField({
  label,
  value,
  onChange,
  min,
  hint,
  disabled = false,
  error,
  placeholder = "Add date",
  className,
}: DateFieldProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(() =>
    startOfMonth(value ? fromISODate(value) : new Date()),
  );

  useClickOutside(wrapperRef, () => setOpen(false), open);

  const today = startOfDay(new Date());
  const floor = min ? fromISODate(min) : today;
  const selected = value ? fromISODate(value) : null;

  const selectDay = (day: Date) => {
    if (day < floor) return;
    onChange(toISODate(day));
    setOpen(false);
  };

  return (
    <div
      ref={wrapperRef}
      className={cn("relative", className)}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) setOpen(false);
      }}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          // Jump the calendar to the selected month each time it opens, so
          // re-opening after a change never strands the user in the wrong month.
          if (!open) setViewMonth(startOfMonth(selected ?? floor));
          setOpen((v) => !v);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-describedby={error ? `${label}-error` : undefined}
        className={cn(
          "relative flex w-full items-center gap-2 rounded-field border bg-surface px-4 py-3 text-left transition-colors",
          disabled && "cursor-not-allowed opacity-55",
          error ? "border-danger" : "border-line hover:border-primary",
        )}
      >
        <span className="pointer-events-none absolute -top-2.5 left-3 truncate bg-surface px-1 text-xs font-medium text-muted">
          {label}
        </span>
        <CalendarDays className="size-4 shrink-0 text-muted" aria-hidden="true" />
        <span
          className={cn(
            "flex-1 truncate text-sm font-semibold",
            value ? "text-ink" : "text-muted",
          )}
        >
          {value ? formatDisplayDate(value) : placeholder}
        </span>
      </button>

      {hint && !error && <p className="mt-1 px-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 px-1 text-xs text-danger">{error}</p>}

      {open && (
        <div
          role="dialog"
          aria-label={label}
          className="animate-pop-in absolute left-0 top-full z-50 mt-2 rounded-card border border-line bg-surface p-4 shadow-menu"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewMonth((m) => addMonths(m, -1))}
              aria-label="Previous month"
              className="grid size-8 place-items-center rounded-full text-ink transition-colors hover:bg-surface-muted"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              aria-label="Next month"
              className="grid size-8 place-items-center rounded-full text-ink transition-colors hover:bg-surface-muted"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
          <div className="flex gap-6">
            <MonthGrid
              date={viewMonth}
              from={selected}
              to={selected}
              today={floor}
              onSelect={selectDay}
            />
            <MonthGrid
              date={addMonths(viewMonth, 1)}
              from={selected}
              to={selected}
              today={floor}
              onSelect={selectDay}
              className="hidden sm:block"
            />
          </div>
        </div>
      )}
    </div>
  );
}
