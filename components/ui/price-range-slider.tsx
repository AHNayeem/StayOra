"use client";

import { useCallback, useId, type CSSProperties } from "react";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface RangeValue {
  min: number;
  max: number;
}

interface PriceRangeSliderProps {
  /** Absolute lower bound of the track. */
  min: number;
  /** Absolute upper bound of the track. */
  max: number;
  step?: number;
  value: RangeValue;
  onChange: (value: RangeValue) => void;
  label?: string;
  /** Format the endpoint labels. Defaults to USD via {@link formatPrice}. */
  format?: (value: number) => string;
  className?: string;
}

/**
 * PriceRangeSlider — a dual-thumb range control for price/number filters. Two
 * overlaid native range inputs keep keyboard and screen-reader support for free;
 * the selected segment is drawn with a CSS variable (data), while all styling
 * stays in utility classes. Thumbs cannot cross (clamped by one step).
 */
export function PriceRangeSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
  label,
  format = (v) => formatPrice(v),
  className,
}: PriceRangeSliderProps) {
  const id = useId();
  const span = Math.max(1, max - min);
  const lowPct = ((value.min - min) / span) * 100;
  const highPct = ((value.max - min) / span) * 100;

  const setLow = useCallback(
    (n: number) => onChange({ min: Math.min(n, value.max - step), max: value.max }),
    [onChange, value.max, step],
  );
  const setHigh = useCallback(
    (n: number) => onChange({ min: value.min, max: Math.max(n, value.min + step) }),
    [onChange, value.min, step],
  );

  const thumb =
    "pointer-events-none absolute inset-x-0 top-1/2 h-0 w-full -translate-y-1/2 appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-surface [&::-webkit-slider-thumb]:shadow-card [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-surface";

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-ink">{label}</span>
          <span className="text-sm font-semibold text-ink tabular-nums">
            {format(value.min)} – {format(value.max)}
          </span>
        </div>
      )}

      <div
        className="relative h-5"
        style={
          { "--range-low": `${lowPct}%`, "--range-high": `${highPct}%` } as CSSProperties
        }
      >
        {/* Track */}
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-pill bg-surface-muted" />
        {/* Selected segment */}
        <div className="absolute top-1/2 left-(--range-low) h-1.5 w-[calc(var(--range-high)-var(--range-low))] -translate-y-1/2 rounded-pill bg-primary" />
        {/* Thumbs */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value.min}
          onChange={(e) => setLow(Number(e.target.value))}
          aria-label={label ? `${label} minimum` : "Minimum"}
          aria-valuetext={format(value.min)}
          id={`${id}-min`}
          className={thumb}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value.max}
          onChange={(e) => setHigh(Number(e.target.value))}
          aria-label={label ? `${label} maximum` : "Maximum"}
          aria-valuetext={format(value.max)}
          id={`${id}-max`}
          className={thumb}
        />
      </div>
    </div>
  );
}
