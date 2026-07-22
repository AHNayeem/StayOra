"use client";

import { SlidersHorizontal } from "lucide-react";
import { Select } from "@/components/ui/select";
import { SORT_OPTIONS, type SortKey } from "@/constants/listing";

interface ListingResultsBarProps {
  /** Number of results after filtering. */
  total: number;
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
  /** Opens the filter drawer on mobile. */
  onOpenFilters: () => void;
  /** Count of active filters, shown on the mobile trigger. */
  activeCount: number;
}

/**
 * ListingResultsBar — the row above the grid: a live result count, the sort
 * selector, and (on mobile, where the sidebar is hidden) a button that opens the
 * filter drawer.
 */
export function ListingResultsBar({
  total,
  sort,
  onSortChange,
  onOpenFilters,
  activeCount,
}: ListingResultsBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="text-sm text-body">
        Showing <span className="font-semibold text-ink">{total}</span>{" "}
        {total === 1 ? "result" : "results"}
      </p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenFilters}
          className="inline-flex h-11 items-center gap-2 rounded-field border border-line px-4 text-sm font-medium text-ink transition-colors hover:border-primary hover:text-primary lg:hidden"
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Filters
          {activeCount > 0 && (
            <span className="grid size-5 place-items-center rounded-full bg-primary text-xs font-semibold text-white">
              {activeCount}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2">
          <label
            htmlFor="listing-sort"
            className="hidden text-sm text-muted sm:block"
          >
            Sort by
          </label>
          <Select
            id="listing-sort"
            value={sort}
            onChange={(event) => onSortChange(event.target.value as SortKey)}
            options={SORT_OPTIONS}
            wrapperClassName="w-48"
          />
        </div>
      </div>
    </div>
  );
}
