"use client";

import { useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import type { DateRangeValue } from "@/types/search";
import { useClickOutside } from "@/hooks/use-click-outside";
import {
  addMonths,
  buildMonthDays,
  formatDisplayDate,
  fromISODate,
  isSameDay,
  MONTH_LABELS,
  startOfDay,
  startOfMonth,
  toISODate,
  WEEKDAY_LABELS,
} from "@/lib/date";
import { cn } from "@/lib/utils";
import { FieldShell } from "./field-popover";

interface DateRangePickerProps {
  startLabel: string;
  endLabel: string;
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
}

/**
 * DateRangePicker — check-in / check-out selection. Two aligned trigger columns
 * open a shared month calendar. First click sets the start, second sets the end
 * (clicking earlier than the start restarts the range). Past dates are disabled.
 */
export function DateRangePicker({
  startLabel,
  endLabel,
  value,
  onChange,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(() =>
    startOfMonth(value.from ? fromISODate(value.from) : new Date()),
  );
  const wrapperRef = useRef<HTMLDivElement>(null);

  useClickOutside(wrapperRef, () => setOpen(false), open);

  const today = startOfDay(new Date());
  const from = value.from ? fromISODate(value.from) : null;
  const to = value.to ? fromISODate(value.to) : null;

  const selectDay = (day: Date) => {
    const iso = toISODate(day);
    if (!from || (from && to)) {
      onChange({ from: iso, to: null });
      return;
    }
    if (day < from) {
      onChange({ from: iso, to: null });
      return;
    }
    onChange({ from: value.from, to: iso });
    setOpen(false);
  };

  return (
    <div
      ref={wrapperRef}
      className="relative flex flex-1"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) setOpen(false);
      }}
    >
      <DateTrigger
        label={startLabel}
        value={value.from}
        onClick={() => setOpen(true)}
      />
      <span className="my-2 w-px bg-line" aria-hidden="true" />
      <DateTrigger
        label={endLabel}
        value={value.to}
        onClick={() => setOpen(true)}
      />

      {open && (
        <div
          role="dialog"
          aria-label="Choose dates"
          className="animate-pop-in absolute left-0 top-full z-40 mt-2 rounded-card border border-line bg-surface p-4 shadow-menu"
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
              from={from}
              to={to}
              today={today}
              onSelect={selectDay}
            />
            <MonthGrid
              date={addMonths(viewMonth, 1)}
              from={from}
              to={to}
              today={today}
              onSelect={selectDay}
              className="hidden sm:block"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function DateTrigger({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 items-center rounded-field text-left transition-colors hover:bg-surface-muted"
    >
      <FieldShell icon={<CalendarDays className="size-4" />} label={label}>
        <span
          className={cn(
            "block truncate text-sm font-semibold",
            value ? "text-ink" : "text-muted",
          )}
        >
          {value ? formatDisplayDate(value) : "Add date"}
        </span>
      </FieldShell>
    </button>
  );
}

function MonthGrid({
  date,
  from,
  to,
  today,
  onSelect,
  className,
}: {
  date: Date;
  from: Date | null;
  to: Date | null;
  today: Date;
  onSelect: (day: Date) => void;
  className?: string;
}) {
  const days = buildMonthDays(date.getFullYear(), date.getMonth());

  return (
    <div className={cn("w-64", className)}>
      <p className="mb-3 text-center text-sm font-semibold text-ink">
        {MONTH_LABELS[date.getMonth()]} {date.getFullYear()}
      </p>
      <div className="mb-1 grid grid-cols-7 text-center text-xs font-medium text-muted">
        {WEEKDAY_LABELS.map((w) => (
          <span key={w} className="py-1">
            {w}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {days.map((day, i) => {
          if (!day) return <span key={`pad-${i}`} />;
          const disabled = day < today;
          const isStart = from && isSameDay(day, from);
          const isEnd = to && isSameDay(day, to);
          const inRange = from && to && day > from && day < to;
          const isEndpoint = isStart || isEnd;

          return (
            <button
              key={toISODate(day)}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(day)}
              aria-label={formatDisplayDate(toISODate(day))}
              className={cn(
                "mx-auto grid size-9 place-items-center rounded-full text-sm transition-colors",
                disabled && "cursor-not-allowed text-muted/40",
                !disabled && !isEndpoint && !inRange && "text-ink hover:bg-primary-50",
                inRange && "rounded-none bg-primary-50 text-primary",
                isEndpoint && "bg-primary font-semibold text-white",
              )}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
