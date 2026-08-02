"use client";

import { useRef, useState } from "react";
import { ChevronDown, Minus, Plus, Users } from "lucide-react";
import type { CabinClass, PassengerCounts, PassengerType } from "@/types/flight";
import { CABIN_CLASSES } from "@/types/flight";
import { CABIN_LABEL } from "@/lib/mock/fares";
import { PASSENGER_TYPE_HINT, PASSENGER_TYPE_LABEL } from "@/lib/mock/passengers";
import { useClickOutside } from "@/hooks/use-click-outside";
import { cn } from "@/lib/utils";

/** Per-type bounds. Infants are capped separately — see {@link clampCounts}. */
const LIMITS: Record<PassengerType, { min: number; max: number }> = {
  adult: { min: 1, max: 9 },
  child: { min: 0, max: 8 },
  infant: { min: 0, max: 9 },
};

/** Airline rule: total seated passengers per booking. */
const MAX_SEATED = 9;

/**
 * Enforce the two rules every airline applies:
 *  - at most nine seated passengers (adults + children) on one booking; and
 *  - never more infants than adults, because each lap infant needs a lap.
 *
 * Applied centrally so the stepper can't produce a combination the fare engine
 * would later reject.
 */
export function clampCounts(counts: PassengerCounts): PassengerCounts {
  const adults = Math.max(LIMITS.adult.min, Math.min(LIMITS.adult.max, counts.adults));
  const children = Math.max(
    LIMITS.child.min,
    Math.min(LIMITS.child.max, MAX_SEATED - adults, counts.children),
  );
  const infants = Math.max(0, Math.min(adults, counts.infants));
  return { adults, children, infants };
}

interface PassengerFieldProps {
  label?: string;
  value: PassengerCounts;
  cabin: CabinClass;
  onChange: (counts: PassengerCounts) => void;
  onCabinChange: (cabin: CabinClass) => void;
  className?: string;
}

/**
 * PassengerField — combined traveller-count and cabin-class popover.
 *
 * The two belong together: they're the "who and how" of a search, they're read
 * as one phrase ("2 travellers, Business"), and pairing them keeps the search
 * bar to four fields instead of five.
 */
export function PassengerField({
  label = "Travellers & cabin",
  value,
  cabin,
  onChange,
  onCabinChange,
  className,
}: PassengerFieldProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useClickOutside(wrapperRef, () => setOpen(false), open);

  const total = value.adults + value.children + value.infants;
  const summary = `${total} traveller${total === 1 ? "" : "s"} · ${CABIN_LABEL[cabin]}`;

  const step = (type: PassengerType, delta: number) => {
    const next: PassengerCounts = {
      adults: value.adults + (type === "adult" ? delta : 0),
      children: value.children + (type === "child" ? delta : 0),
      infants: value.infants + (type === "infant" ? delta : 0),
    };
    onChange(clampCounts(next));
  };

  const rows: Array<{ type: PassengerType; count: number; canAdd: boolean; canRemove: boolean }> = [
    {
      type: "adult",
      count: value.adults,
      canAdd: value.adults < LIMITS.adult.max && value.adults + value.children < MAX_SEATED,
      canRemove: value.adults > LIMITS.adult.min,
    },
    {
      type: "child",
      count: value.children,
      canAdd: value.children < LIMITS.child.max && value.adults + value.children < MAX_SEATED,
      canRemove: value.children > 0,
    },
    {
      type: "infant",
      count: value.infants,
      // The infant cap is the adult count, and the UI says so rather than just
      // going dead — an unexplained disabled button reads as a bug.
      canAdd: value.infants < value.adults,
      canRemove: value.infants > 0,
    },
  ];

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
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="relative flex w-full items-center gap-2 rounded-field border border-line bg-surface px-4 py-3 text-left transition-colors hover:border-primary"
      >
        <span className="pointer-events-none absolute -top-2.5 left-3 truncate bg-surface px-1 text-xs font-medium text-muted">
          {label}
        </span>
        <Users className="size-4 shrink-0 text-muted" aria-hidden="true" />
        <span className="flex-1 truncate text-sm font-semibold text-ink">{summary}</span>
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
          aria-label={label}
          className="animate-pop-in absolute right-0 top-full z-50 mt-2 w-80 rounded-card border border-line bg-surface p-4 shadow-menu"
        >
          <ul className="space-y-1">
            {rows.map((row) => (
              <li key={row.type} className="flex items-center justify-between gap-4 py-2">
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink">
                    {PASSENGER_TYPE_LABEL[row.type]}
                  </span>
                  <span className="block text-xs text-muted">
                    {PASSENGER_TYPE_HINT[row.type]}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <StepButton
                    ariaLabel={`Remove one ${PASSENGER_TYPE_LABEL[row.type].toLowerCase()}`}
                    onClick={() => step(row.type, -1)}
                    disabled={!row.canRemove}
                    icon={<Minus className="size-4" aria-hidden="true" />}
                  />
                  <span
                    aria-live="polite"
                    className="w-5 text-center text-sm font-semibold tabular-nums text-ink"
                  >
                    {row.count}
                  </span>
                  <StepButton
                    ariaLabel={`Add one ${PASSENGER_TYPE_LABEL[row.type].toLowerCase()}`}
                    onClick={() => step(row.type, 1)}
                    disabled={!row.canAdd}
                    icon={<Plus className="size-4" aria-hidden="true" />}
                  />
                </span>
              </li>
            ))}
          </ul>

          {value.infants >= value.adults && value.infants > 0 && (
            <p className="mt-1 rounded-field bg-surface-muted px-3 py-2 text-xs text-muted">
              Each infant travels on an adult&apos;s lap, so you&apos;ll need one adult per infant.
            </p>
          )}
          {value.adults + value.children >= MAX_SEATED && (
            <p className="mt-1 rounded-field bg-surface-muted px-3 py-2 text-xs text-muted">
              Nine seated travellers is the maximum per booking. For larger groups,{" "}
              <span className="font-medium text-ink">contact our group desk</span>.
            </p>
          )}

          <fieldset className="mt-4 border-t border-line pt-4">
            <legend className="sr-only">Cabin class</legend>
            <p className="mb-2 text-sm font-medium text-ink">Cabin class</p>
            <div className="grid grid-cols-2 gap-2">
              {CABIN_CLASSES.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={cabin === option}
                  onClick={() => onCabinChange(option)}
                  className={cn(
                    "rounded-field border px-3 py-2 text-sm font-medium transition-colors",
                    cabin === option
                      ? "border-primary bg-primary-50 text-primary"
                      : "border-line text-body hover:border-primary/40",
                  )}
                >
                  {CABIN_LABEL[option]}
                </button>
              ))}
            </div>
          </fieldset>
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
