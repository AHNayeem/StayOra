import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Accessible label for the control (e.g. "Adults"). */
  label: string;
  /** Visible label + hint shown to the left of the controls. */
  showLabel?: boolean;
  hint?: string;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Stepper — a numeric increment/decrement control clamped to [min, max]. Used
 * for guest counts, rooms, passengers and quantities. Controlled: it owns no
 * state, so it composes into forms and config-driven guest selectors.
 */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  label,
  showLabel = false,
  hint,
  size = "md",
  className,
}: StepperProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const set = (n: number) => {
    const next = clamp(n);
    if (next !== value) onChange(next);
  };

  const btn = cn(
    "grid shrink-0 place-items-center rounded-full border border-line text-ink transition-colors hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-40",
    size === "sm" ? "size-8" : "size-9",
  );

  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      {showLabel && (
        <span className="flex flex-col">
          <span className="text-sm font-medium text-ink">{label}</span>
          {hint && <span className="text-xs text-muted">{hint}</span>}
        </span>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          className={btn}
          onClick={() => set(value - step)}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
        >
          <Minus className="size-4" aria-hidden="true" />
        </button>
        <span
          className="w-6 text-center text-sm font-semibold tabular-nums text-ink"
          aria-live="polite"
          aria-label={`${label}: ${value}`}
        >
          {value}
        </span>
        <button
          type="button"
          className={btn}
          onClick={() => set(value + step)}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
