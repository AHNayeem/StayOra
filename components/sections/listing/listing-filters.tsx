"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { controlClasses } from "@/components/ui/field";
import {
  PriceRangeSlider,
  type RangeValue,
} from "@/components/ui/price-range-slider";
import type {
  FacetGroup,
  ListingFilterState,
  PriceRange,
} from "@/lib/listing-filter";
import { cn } from "@/lib/utils";

interface ListingFiltersProps {
  /** Absolute price bounds for the slider track. */
  bounds: PriceRange;
  /** Derived facet groups (options + counts) for this vertical. */
  groups: FacetGroup[];
  state: ListingFilterState;
  activeCount: number;
  onSearchChange: (value: string) => void;
  onPriceChange: (value: RangeValue) => void;
  onToggleFacet: (key: string, value: string) => void;
  onClear: () => void;
  className?: string;
}

/**
 * ListingFilters — the config-driven filter sidebar: keyword search, a price
 * range slider and one checkbox group per facet the vertical declares. Fully
 * controlled; the parent {@link ListingTemplate} owns the state so the same panel
 * can render in the desktop rail and the mobile drawer against one source of
 * truth.
 */
export function ListingFilters({
  bounds,
  groups,
  state,
  activeCount,
  onSearchChange,
  onPriceChange,
  onToggleFacet,
  onClear,
  className,
}: ListingFiltersProps) {
  const priceDisabled = bounds.min >= bounds.max;

  return (
    <div className={cn("flex flex-col gap-7", className)}>
      <div className="flex items-center justify-between">
        <h2 className="inline-flex items-center gap-2 text-h3">
          <SlidersHorizontal className="size-5 text-primary" aria-hidden="true" />
          Filters
        </h2>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary-700"
          >
            <X className="size-4" aria-hidden="true" />
            Clear all
          </button>
        )}
      </div>

      {/* Keyword search */}
      <div className="relative">
        <label htmlFor="listing-search" className="sr-only">
          Search listings
        </label>
        <Search
          className="pointer-events-none absolute inset-y-0 left-3 my-auto size-4 text-muted"
          aria-hidden="true"
        />
        <input
          id="listing-search"
          type="search"
          value={state.search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by name or place"
          className={cn(controlClasses(false), "h-11 pl-10")}
        />
      </div>

      {/* Price range */}
      {!priceDisabled && (
        <div className="border-t border-line pt-6">
          <PriceRangeSlider
            label="Price range"
            min={bounds.min}
            max={bounds.max}
            value={state.price}
            onChange={onPriceChange}
          />
        </div>
      )}

      {/* Facet groups */}
      {groups.map((group) => (
        <fieldset key={group.key} className="border-t border-line pt-6">
          <legend className="mb-3 text-sm font-semibold text-ink">
            {group.label}
          </legend>
          <div className="flex flex-col gap-3">
            {group.options.map((option) => {
              const checked =
                state.facets[group.key]?.includes(option.value) ?? false;
              return (
                <Checkbox
                  key={option.value}
                  checked={checked}
                  onChange={() => onToggleFacet(group.key, option.value)}
                  label={
                    <span className="flex w-full items-center justify-between gap-2">
                      <span>{option.value}</span>
                      <span className="text-xs text-muted tabular-nums">
                        {option.count}
                      </span>
                    </span>
                  }
                  wrapperClassName="[&_label]:flex-1"
                />
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
