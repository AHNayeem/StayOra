"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2, MapPin, Plane } from "lucide-react";
import type { Airport } from "@/types/flight";
import { searchAirports } from "@/services/flight.service";
import { AIRPORTS_BY_CODE } from "@/lib/mock/airports";
import { useClickOutside } from "@/hooks/use-click-outside";
import { cn } from "@/lib/utils";

interface AirportFieldProps {
  label: string;
  /** Selected IATA code, or "" when nothing is chosen. */
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  /** Code to exclude from results — you can't fly a route to its own origin. */
  exclude?: string;
  /** Marks the field invalid and wires `aria-describedby` to the message. */
  error?: string;
  className?: string;
  icon?: "origin" | "destination";
}

/**
 * AirportField — combobox with debounced, service-backed airport autocomplete.
 *
 * Reads through {@link searchAirports} rather than filtering a local array, so
 * the component is already written against a network call: it debounces input,
 * shows a pending state, and ignores out-of-order responses. Swapping the mock
 * for a live endpoint requires no change here.
 *
 * Keyboard: ↑/↓ move, Enter selects, Escape closes. Follows the WAI-ARIA
 * combobox pattern with `aria-activedescendant` so screen readers announce the
 * highlighted option without moving DOM focus off the input.
 */
export function AirportField({
  label,
  value,
  onChange,
  placeholder = "City or airport",
  exclude,
  error,
  className,
  icon = "origin",
}: AirportFieldProps) {
  const listId = useId();
  const errorId = `${listId}-error`;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = value ? AIRPORTS_BY_CODE[value] : undefined;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Airport[]>([]);
  const [active, setActive] = useState(0);
  const [pending, setPending] = useState(false);

  useClickOutside(wrapperRef, () => setOpen(false), open);

  // Debounced lookup.
  //
  // Every state update happens inside the timer or the promise callback, never
  // synchronously in the effect body — the effect's only synchronous job is to
  // schedule work, which is what an effect is for. The `cancelled` flag stops a
  // slow early response from overwriting a fast later one.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      setPending(true);
      searchAirports(query, 8)
        .then((found) => {
          if (cancelled) return;
          setResults(found.filter((a) => a.code !== exclude));
          setActive(0);
        })
        .finally(() => {
          if (!cancelled) setPending(false);
        });
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open, exclude]);

  const pick = (airport: Airport) => {
    onChange(airport.code);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && open && results[active]) {
      e.preventDefault();
      pick(results[active]);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  // Show the chosen airport when idle; swap to the raw query while typing.
  const display = open ? query : selected ? `${selected.city} (${selected.code})` : "";
  const Icon = icon === "origin" ? Plane : MapPin;

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <div
        className={cn(
          "relative flex w-full items-center gap-2 rounded-field border bg-surface px-4 py-3 transition-colors",
          error
            ? "border-danger focus-within:border-danger"
            : "border-line focus-within:border-primary",
        )}
      >
        <span className="pointer-events-none absolute -top-2.5 left-3 truncate bg-surface px-1 text-xs font-medium text-muted">
          {label}
        </span>
        <Icon
          className={cn("size-4 shrink-0", icon === "origin" ? "text-primary" : "text-accent-600")}
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && results[active] ? `${listId}-${results[active].code}` : undefined}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          value={display}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setQuery("");
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          className="w-full min-w-0 truncate bg-transparent text-sm font-semibold text-ink outline-none placeholder:font-normal placeholder:text-muted"
        />
        {pending && open && (
          <Loader2 className="size-4 shrink-0 animate-spin text-muted" aria-hidden="true" />
        )}
      </div>

      {selected && !open && (
        <p className="mt-1 truncate px-1 text-xs text-muted">{selected.name}</p>
      )}
      {error && (
        <p id={errorId} className="mt-1 px-1 text-xs text-danger">
          {error}
        </p>
      )}

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="animate-pop-in absolute left-0 top-full z-50 mt-2 max-h-80 w-full min-w-[19rem] overflow-auto rounded-card border border-line bg-surface p-2 shadow-menu"
        >
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted">
              {pending ? "Searching…" : `No airports match “${query}”.`}
            </li>
          ) : (
            results.map((airport, i) => (
              <li
                key={airport.code}
                id={`${listId}-${airport.code}`}
                role="option"
                aria-selected={i === active}
              >
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(airport)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-field px-3 py-2.5 text-left transition-colors",
                    i === active ? "bg-primary-50" : "hover:bg-surface-muted",
                  )}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-field bg-surface-muted text-xs font-bold text-ink">
                    {airport.code}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">
                      {airport.city}
                      <span className="font-normal text-muted">, {airport.country}</span>
                    </span>
                    <span className="block truncate text-xs text-muted">{airport.name}</span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
