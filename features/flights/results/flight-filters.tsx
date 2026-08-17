"use client";

import { RotateCcw } from "lucide-react";
import type {
  Alliance,
  FlightFilters as Filters,
  FlightResultFacets,
  TimeBand,
} from "@/types/flight";
import { ALLIANCES, TIME_BANDS } from "@/types/flight";
import { TIME_BAND_RANGES, formatDuration } from "@/lib/flight-time";
import { AIRLINES_BY_CODE } from "@/lib/mock/airlines";
import { useLocale } from "@/features/i18n";
import { Checkbox } from "@/components/ui/checkbox";
import { PriceRangeSlider } from "@/components/ui/price-range-slider";
import { Button } from "@/components/ui/button";
import { AirlineLogo } from "../airline-logo";

interface FlightFiltersProps {
  facets: FlightResultFacets;
  value: Filters;
  onChange: (next: Filters) => void;
  onReset: () => void;
  activeCount: number;
}

/**
 * FlightFilters — the results filter rail.
 *
 * Each facet shows a count and a "from" price where one exists, so the traveller
 * can see the cost of a preference *before* applying it — filtering to non-stop
 * and then discovering it doubles the fare is the worst version of this
 * interaction. Filters that would empty the list are disabled rather than
 * hidden, because a facet vanishing reads as a bug.
 */
export function FlightFilters({
  facets,
  value,
  onChange,
  onReset,
  activeCount,
}: FlightFiltersProps) {
  const { money } = useLocale();

  const patch = (next: Partial<Filters>) => onChange({ ...value, ...next });

  const toggle = <T,>(list: T[], item: T): T[] =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

  const durationSpan = facets.maxDurationMinutes - facets.minDurationMinutes;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-ink">Filters</h2>
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            leftIcon={<RotateCcw className="size-3.5" aria-hidden="true" />}
            className="text-primary"
          >
            Reset ({activeCount})
          </Button>
        )}
      </div>

      {/* ---- Stops ---------------------------------------------------------- */}
      {facets.stops.length > 1 && (
        <FilterGroup title="Stops">
          {facets.stops.map((bucket) => (
            <div key={bucket.stops} className="flex items-center justify-between gap-2">
              <Checkbox
                label={
                  bucket.stops === 0
                    ? "Non-stop"
                    : bucket.stops === 1
                      ? "1 stop"
                      : "2+ stops"
                }
                checked={value.stops.includes(bucket.stops)}
                onChange={() => patch({ stops: toggle(value.stops, bucket.stops) })}
              />
              <span className="shrink-0 text-xs text-muted">
                {money(bucket.fromUsd)}
              </span>
            </div>
          ))}
        </FilterGroup>
      )}

      {/* ---- Price ---------------------------------------------------------- */}
      {facets.priceMaxUsd > facets.priceMinUsd && (
        <FilterGroup title="Price">
          <PriceRangeSlider
            min={facets.priceMinUsd}
            max={facets.priceMaxUsd}
            value={{ min: value.priceMinUsd, max: value.priceMaxUsd }}
            onChange={(range) =>
              patch({ priceMinUsd: range.min, priceMaxUsd: range.max })
            }
            format={money}
          />
        </FilterGroup>
      )}

      {/* ---- Departure / arrival time --------------------------------------- */}
      <FilterGroup title="Departure time">
        <TimeBandGrid
          selected={value.departBands}
          onToggle={(band) => patch({ departBands: toggle(value.departBands, band) })}
        />
      </FilterGroup>

      <FilterGroup title="Arrival time">
        <TimeBandGrid
          selected={value.arriveBands}
          onToggle={(band) => patch({ arriveBands: toggle(value.arriveBands, band) })}
        />
      </FilterGroup>

      {/* ---- Duration ------------------------------------------------------- */}
      {durationSpan > 30 && (
        <FilterGroup title="Total journey time">
          <input
            type="range"
            min={facets.minDurationMinutes}
            max={facets.maxDurationMinutes}
            step={15}
            value={value.maxDurationMinutes || facets.maxDurationMinutes}
            onChange={(e) => {
              const next = Number(e.target.value);
              // Snapping back to 0 at the top end means "no cap", so the filter
              // doesn't count as active when it isn't narrowing anything.
              patch({
                maxDurationMinutes: next >= facets.maxDurationMinutes ? 0 : next,
              });
            }}
            aria-label="Maximum journey time"
            className="w-full accent-primary"
          />
          <p className="text-xs text-muted">
            Up to{" "}
            <span className="font-medium text-ink">
              {formatDuration(value.maxDurationMinutes || facets.maxDurationMinutes)}
            </span>
          </p>
        </FilterGroup>
      )}

      {/* ---- Layover -------------------------------------------------------- */}
      {facets.stops.some((s) => s.stops > 0) && (
        <FilterGroup title="Maximum layover">
          <div className="flex flex-wrap gap-2">
            {[90, 180, 300, 0].map((minutes) => (
              <button
                key={minutes}
                type="button"
                aria-pressed={value.maxLayoverMinutes === minutes}
                onClick={() => patch({ maxLayoverMinutes: minutes })}
                className={
                  value.maxLayoverMinutes === minutes
                    ? "rounded-pill border border-primary bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary"
                    : "rounded-pill border border-line px-3 py-1.5 text-xs font-medium text-body transition-colors hover:border-primary"
                }
              >
                {minutes === 0 ? "Any" : `Under ${formatDuration(minutes)}`}
              </button>
            ))}
          </div>
        </FilterGroup>
      )}

      {/* ---- Airlines ------------------------------------------------------- */}
      {facets.airlines.length > 1 && (
        <FilterGroup title="Airlines">
          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {facets.airlines.map((entry) => (
              <div key={entry.code} className="flex min-w-0 items-center justify-between gap-2">
                <Checkbox
                  wrapperClassName="min-w-0 flex-1"
                  label={
                    <span className="flex min-w-0 items-center gap-2">
                      <AirlineLogo code={entry.code} size="xs" />
                      <span
                        className="truncate"
                        title={AIRLINES_BY_CODE[entry.code]?.name ?? entry.code}
                      >
                        {AIRLINES_BY_CODE[entry.code]?.name ?? entry.code}
                      </span>
                    </span>
                  }
                  checked={value.airlines.includes(entry.code)}
                  onChange={() => patch({ airlines: toggle(value.airlines, entry.code) })}
                />
                <span className="shrink-0 text-xs text-muted">
                  {money(entry.fromUsd)}
                </span>
              </div>
            ))}
          </div>
        </FilterGroup>
      )}

      {/* ---- Alliance ------------------------------------------------------- */}
      {facets.alliances.length > 1 && (
        <FilterGroup title="Alliance">
          {ALLIANCES.filter((a) => facets.alliances.some((f) => f.alliance === a)).map(
            (alliance) => {
              const facet = facets.alliances.find((f) => f.alliance === alliance);
              return (
                <div key={alliance} className="flex items-center justify-between gap-2">
                  <Checkbox
                    label={alliance === "None" ? "Independent carriers" : alliance}
                    checked={value.alliances.includes(alliance as Alliance)}
                    onChange={() =>
                      patch({ alliances: toggle(value.alliances, alliance as Alliance) })
                    }
                  />
                  <span className="shrink-0 text-xs text-muted">{facet?.count}</span>
                </div>
              );
            },
          )}
        </FilterGroup>
      )}

      {/* ---- Fare conditions ------------------------------------------------ */}
      <FilterGroup title="Fare conditions">
        <Checkbox
          label="Refundable fares only"
          checked={value.refundableOnly}
          onChange={(e) => patch({ refundableOnly: e.target.checked })}
        />
        <Checkbox
          label="Checked baggage included"
          checked={value.baggageIncluded}
          onChange={(e) => patch({ baggageIncluded: e.target.checked })}
        />
      </FilterGroup>
    </div>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  // `min-w-0` overrides the UA-stylesheet `min-inline-size: min-content` on
  // fieldset, which otherwise refuses to shrink and pushes long airline names
  // past the edge of the rail.
  return (
    <fieldset className="min-w-0 border-t border-line pt-5 first-of-type:border-t-0 first-of-type:pt-0">
      <legend className="mb-3 text-sm font-semibold text-ink">{title}</legend>
      <div className="space-y-2.5">{children}</div>
    </fieldset>
  );
}

function TimeBandGrid({
  selected,
  onToggle,
}: {
  selected: TimeBand[];
  onToggle: (band: TimeBand) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {TIME_BANDS.map((band) => {
        const meta = TIME_BAND_RANGES[band];
        const active = selected.includes(band);
        return (
          <button
            key={band}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(band)}
            className={
              active
                ? "rounded-field border border-primary bg-primary-50 px-3 py-2 text-left transition-colors"
                : "rounded-field border border-line px-3 py-2 text-left transition-colors hover:border-primary/50"
            }
          >
            <span
              className={`block text-xs font-medium ${active ? "text-primary" : "text-ink"}`}
            >
              {meta.label}
            </span>
            <span className="block text-[0.6875rem] text-muted">{meta.hint}</span>
          </button>
        );
      })}
    </div>
  );
}
