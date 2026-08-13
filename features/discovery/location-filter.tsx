"use client";

import { LocateFixed, Loader2, X } from "lucide-react";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DEMO_ORIGINS, RADIUS_OPTIONS, type GeoOrigin } from "./geo";
import { NEAR_ME_MESSAGE, type NearMeStatus } from "./use-near-me";

interface LocationFilterProps {
  status: NearMeStatus;
  origin: GeoOrigin | null;
  usingFallback: boolean;
  radiusKm: number;
  matchCount: number;
  onLocate: () => void;
  onPickOrigin: (origin: GeoOrigin) => void;
  onRadiusChange: (km: number) => void;
  onClear: () => void;
  className?: string;
}

/**
 * "Near me" plus the approximate-radius filter.
 *
 * The fallback is stated, never hidden: when the browser declines or can't
 * answer, the control says so and names the demo location it used instead, so
 * a denied permission never looks like a broken feature. The active state
 * always shows how many results survive the radius.
 */
export function LocationFilter({
  status,
  origin,
  usingFallback,
  radiusKm,
  matchCount,
  onLocate,
  onPickOrigin,
  onRadiusChange,
  onClear,
  className,
}: LocationFilterProps) {
  const locating = status === "locating";
  const message = NEAR_ME_MESSAGE[status];

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onLocate}
          disabled={locating}
          aria-busy={locating}
          className={cn(
            "inline-flex h-11 items-center gap-2 rounded-field border px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-70",
            origin
              ? "border-primary bg-primary/10 text-primary"
              : "border-line text-ink hover:border-primary hover:text-primary",
          )}
        >
          {locating ? (
            <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
          ) : (
            <LocateFixed className="size-4" aria-hidden="true" />
          )}
          {origin ? `Near ${origin.label}` : "Near me"}
        </button>

        {origin && (
          <>
            <div className="flex items-center gap-2 text-sm text-muted">
              <span aria-hidden="true" className="hidden sm:inline">
                Within
              </span>
              <Select
                aria-label="Search radius"
                value={String(radiusKm)}
                onChange={(e) => onRadiusChange(Number(e.target.value))}
                options={RADIUS_OPTIONS.map((km) => ({
                  value: String(km),
                  label: `${km.toLocaleString()} km`,
                }))}
                wrapperClassName="w-32"
              />
            </div>

            <button
              type="button"
              onClick={onClear}
              className="inline-flex h-11 items-center gap-1.5 rounded-field px-3 text-sm font-medium text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <X className="size-4" aria-hidden="true" />
              Clear location
            </button>
          </>
        )}
      </div>

      {/* One live region covers both the fallback explanation and the count, so
          a screen reader hears the outcome of pressing "Near me" once. */}
      <div aria-live="polite" className="text-sm">
        {message && <p className="text-warning">{message}</p>}
        {origin && !locating && (
          <p className="text-muted">
            <span className="font-semibold text-ink">{matchCount}</span>{" "}
            {matchCount === 1 ? "property" : "properties"} within{" "}
            {radiusKm.toLocaleString()} km of {origin.label}
            {usingFallback ? " (demo location)" : ""}.
          </p>
        )}
      </div>

      {usingFallback && origin && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
          <span>Try another demo location:</span>
          {DEMO_ORIGINS.filter((o) => o.label !== origin.label)
            .slice(0, 4)
            .map((o) => (
              <button
                key={o.label}
                type="button"
                onClick={() => onPickOrigin(o)}
                className="rounded-pill border border-line px-2 py-0.5 font-medium text-body transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {o.label.split(",")[0]}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
