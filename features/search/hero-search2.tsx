"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Search,
} from "lucide-react";
import {
  defaultGuests,
  HERO_SEARCH_TABS,
  POPULAR_DESTINATIONS,
  SEARCH_CONFIG,
  type GuestUnit,
} from "@/constants/search";
import { VERTICALS } from "@/constants/verticals";
import type { BookingVertical } from "@/types/booking";
import type { DateRangeValue, GuestCounts } from "@/types/search";
import {
  addMonths,
  formatDisplayDate,
  fromISODate,
  startOfDay,
  startOfMonth,
  toISODate,
} from "@/lib/date";
import { useClickOutside } from "@/hooks/use-click-outside";
import { useT } from "@/features/i18n";
import { FlightSearchPanel } from "@/features/flights/search/flight-search-panel";
import { VerticalIcon } from "@/components/shared/vertical-icon";
import { cn } from "@/lib/utils";
import { MonthGrid } from "./date-range-picker";

interface HeroSearch2Props {
  /** Which vertical tab is selected initially. Default "hotels". */
  defaultVertical?: BookingVertical;
  className?: string;
}

/** Whole nights between two ISO dates (0 if the range is incomplete). */
function nightsBetween(from: string | null, to: string | null): number {
  if (!from || !to) return 0;
  const ms = fromISODate(to).getTime() - fromISODate(from).getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

/**
 * HeroSearch2 — a visual variant of {@link HeroSearch}. The vertical selector is
 * a centered floating card that overlaps a single wide search panel; each field
 * is an outlined, floating-label box, and the submit button stands alone,
 * centered beneath the fields. Same domain logic, tabs and navigation as v1.
 */
export function HeroSearch2({
  defaultVertical = "hotels",
  className,
}: HeroSearch2Props) {
  const router = useRouter();
  const t = useT();
  const [activeKey, setActiveKey] = useState<BookingVertical>(defaultVertical);
  const [location, setLocation] = useState("");
  const [dates, setDates] = useState<DateRangeValue>({ from: null, to: null });
  const [guests, setGuests] = useState<GuestCounts>(() =>
    defaultGuests(SEARCH_CONFIG[defaultVertical].guestUnits),
  );

  const vertical = VERTICALS[activeKey];
  const config = SEARCH_CONFIG[activeKey];
  const nights = nightsBetween(dates.from, dates.to);

  const onSelectTab = (key: BookingVertical) => {
    setActiveKey(key);
    setGuests(defaultGuests(SEARCH_CONFIG[key].guestUnits));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (location.trim()) params.set("location", location.trim());
    if (vertical.hasDateRange) {
      if (dates.from) params.set("from", dates.from);
      if (dates.to) params.set("to", dates.to);
    }
    if (vertical.hasGuests) {
      for (const [key, count] of Object.entries(guests)) {
        params.set(key, String(count));
      }
    }
    const query = params.toString();
    router.push(query ? `${vertical.href}?${query}` : vertical.href);
  };

  return (
    <div className={cn("relative flex flex-col items-center", className)}>
      {/* Floating vertical selector, overlapping the panel below */}
      <div className="relative z-20 max-w-[75%] rounded-lg bg-surface px-3 py-4 shadow-card sm:px-6">
        <TabStrip active={activeKey} onSelect={onSelectTab} />
      </div>

      {/* Search panel */}
      <div className="relative z-10 -mt-6 w-full rounded-lg bg-surface p-4 pt-12 shadow-card sm:p-6 sm:pt-14">
        {/*
          Flights need origin *and* destination, trip types and cabin classes,
          which the shared location/date/guest widget can't express — so the
          registry flags them (`VerticalConfig.customSearch`) and the tab swaps
          in the dedicated panel rather than bending this one out of shape.
        */}
        {vertical.customSearch === "flights" ? (
          <FlightSearchPanel variant="embedded" />
        ) : (
        <form onSubmit={onSubmit}>
          <div className="flex flex-col gap-4 md:flex-row md:items-start">
            <div className="md:flex-[1.3]">
              <LocationField
                label={t(config.locationLabel)}
                placeholder={t(config.locationPlaceholder)}
                value={location}
                onChange={setLocation}
              />
            </div>

            {vertical.hasDateRange && (
              <div className="md:flex-[2]">
                <DateField
                  label={`${t(config.startDateLabel)} - ${t(config.endDateLabel)}`}
                  value={dates}
                  onChange={setDates}
                />
                {nights > 0 && (
                  <p className="mt-2 px-1 text-sm font-semibold text-success">
                    {nights} {t(nights === 1 ? "night" : "nights")}
                  </p>
                )}
              </div>
            )}

            {vertical.hasGuests && (
              <div className="md:flex-1">
                <GuestField
                  label={t(config.guestsLabel)}
                  units={config.guestUnits}
                  value={guests}
                  onChange={setGuests}
                />
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-center">
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-field bg-primary px-10 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
            >
              <Search className="size-4" aria-hidden="true" />
              {t("Search")}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tabs                                                                */
/* ------------------------------------------------------------------ */

function TabStrip({
  active,
  onSelect,
}: {
  active: BookingVertical;
  onSelect: (key: BookingVertical) => void;
}) {
  const t = useT();
  return (
    <div
      role="tablist"
      aria-label="Choose what to book"
      className="flex gap-1 overflow-x-auto [scrollbar-width:none] sm:gap-2 [&::-webkit-scrollbar]:hidden"
    >
      {HERO_SEARCH_TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(tab.key)}
            className={cn(
              "flex shrink-0 flex-col items-center gap-1.5 rounded-card px-4 py-2 text-sm font-medium transition-colors sm:px-5",
              isActive
                ? "text-primary"
                : "text-body hover:bg-surface-muted hover:text-ink",
            )}
          >
            <VerticalIcon name={tab.icon} className="size-6" aria-hidden="true" />
            <span className="whitespace-nowrap">{t(tab.labelPlural)}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared outlined-field chrome                                        */
/* ------------------------------------------------------------------ */

const OUTLINED =
  "relative flex w-full items-center gap-2 rounded-field border border-line bg-surface px-4 py-3 text-left transition-colors";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute -top-2.5 left-3 truncate bg-surface px-1 text-xs font-medium text-muted">
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Location                                                            */
/* ------------------------------------------------------------------ */

function LocationField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useClickOutside(wrapperRef, () => setOpen(false), open);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return POPULAR_DESTINATIONS;
    return POPULAR_DESTINATIONS.filter((s) => s.toLowerCase().includes(q));
  }, [value]);

  const pick = (choice: string) => {
    onChange(choice);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && open && active >= 0 && filtered[active]) {
      e.preventDefault();
      pick(filtered[active]);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className={cn(OUTLINED, "focus-within:border-primary")}>
        <FieldLabel>{label}</FieldLabel>
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="hero2-location-listbox"
          aria-autocomplete="list"
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="w-full truncate bg-transparent text-sm font-semibold text-ink outline-none placeholder:font-normal placeholder:text-muted"
        />
        <ChevronDown className="size-4 shrink-0 text-muted" aria-hidden="true" />
      </div>

      {open && (
        <ul
          id="hero2-location-listbox"
          role="listbox"
          className="animate-pop-in absolute left-0 top-full z-40 mt-2 max-h-72 w-72 overflow-auto rounded-card border border-line bg-surface p-2 shadow-menu"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted">
              No matches — press Enter to use “{value}”.
            </li>
          ) : (
            filtered.map((s, i) => (
              <li key={s} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(s)}
                  className={cn(
                    "w-full rounded-field px-3 py-2 text-left text-sm transition-colors",
                    i === active
                      ? "bg-primary-50 text-primary"
                      : "text-body hover:bg-surface-muted",
                  )}
                >
                  {s}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(() =>
    startOfMonth(value.from ? fromISODate(value.from) : new Date()),
  );
  const wrapperRef = useRef<HTMLDivElement>(null);
  const t = useT();

  useClickOutside(wrapperRef, () => setOpen(false), open);

  const today = startOfDay(new Date());
  const from = value.from ? fromISODate(value.from) : null;
  const to = value.to ? fromISODate(value.to) : null;

  const selectDay = (day: Date) => {
    const iso = toISODate(day);
    if (!from || (from && to) || day < from) {
      onChange({ from: iso, to: null });
      return;
    }
    onChange({ from: value.from, to: iso });
    setOpen(false);
  };

  const display =
    value.from && value.to
      ? `${formatDisplayDate(value.from)} - ${formatDisplayDate(value.to)}`
      : value.from
        ? `${formatDisplayDate(value.from)} - ${t("Add date")}`
        : t("Add dates");

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) setOpen(false);
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(OUTLINED, "hover:border-primary")}
      >
        <FieldLabel>{label}</FieldLabel>
        <span
          className={cn(
            "flex-1 truncate text-sm font-semibold",
            value.from ? "text-ink" : "text-muted",
          )}
        >
          {display}
        </span>
        <CalendarDays className="size-4 shrink-0 text-muted" aria-hidden="true" />
      </button>

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

/* ------------------------------------------------------------------ */
/* Guests / beds                                                       */
/* ------------------------------------------------------------------ */

function GuestField({
  label,
  units,
  value,
  onChange,
}: {
  label: string;
  units: GuestUnit[];
  value: GuestCounts;
  onChange: (value: GuestCounts) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const t = useT();

  useClickOutside(wrapperRef, () => setOpen(false), open);

  const summary =
    units
      .filter((u) => (value[u.key] ?? u.min) > 0)
      .map((u) => `${value[u.key] ?? u.min} ${t(u.label).toLowerCase()}`)
      .join(" · ") || t("Add guests");

  const step = (unit: GuestUnit, delta: number) => {
    const current = value[unit.key] ?? unit.min;
    const next = Math.min(unit.max, Math.max(unit.min, current + delta));
    onChange({ ...value, [unit.key]: next });
  };

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) setOpen(false);
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(OUTLINED, "hover:border-primary")}
      >
        <FieldLabel>{label}</FieldLabel>
        <span className="flex-1 truncate text-sm font-semibold text-ink">
          {summary}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="dialog"
          className="animate-pop-in absolute right-0 top-full z-40 mt-2 w-72 rounded-card border border-line bg-surface p-4 shadow-menu"
        >
          <ul className="space-y-1">
            {units.map((unit) => {
              const count = value[unit.key] ?? unit.min;
              return (
                <li
                  key={unit.key}
                  className="flex items-center justify-between gap-4 py-2"
                >
                  <span>
                    <span className="block text-sm font-medium text-ink">
                      {t(unit.label)}
                    </span>
                    {unit.hint && (
                      <span className="block text-xs text-muted">
                        {unit.hint}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-3">
                    <StepButton
                      ariaLabel={`Decrease ${unit.label}`}
                      onClick={() => step(unit, -1)}
                      disabled={count <= unit.min}
                      icon={<Minus className="size-4" aria-hidden="true" />}
                    />
                    <span className="w-6 text-center text-sm font-semibold text-ink">
                      {count}
                    </span>
                    <StepButton
                      ariaLabel={`Increase ${unit.label}`}
                      onClick={() => step(unit, 1)}
                      disabled={count >= unit.max}
                      icon={<Plus className="size-4" aria-hidden="true" />}
                    />
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function StepButton({
  ariaLabel,
  onClick,
  disabled,
  icon,
}: {
  ariaLabel: string;
  onClick: () => void;
  disabled: boolean;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        "grid size-8 place-items-center rounded-full border transition-colors",
        disabled
          ? "cursor-not-allowed border-line text-muted/40"
          : "border-line text-ink hover:border-primary hover:text-primary",
      )}
    >
      {icon}
    </button>
  );
}
