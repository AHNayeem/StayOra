"use client";

import type { ReactNode } from "react";
import { LayoutGrid, Map, SlidersHorizontal } from "lucide-react";
import { Select } from "@/components/ui/select";
import { SORT_OPTIONS, type SortKey } from "@/constants/listing";
import { cn } from "@/lib/utils";

/** How the results are laid out — a grid of cards, or the map + synced list. */
export type ResultsView = "grid" | "map";

interface ListingResultsBarProps {
  /** Number of results after filtering. */
  total: number;
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
  /** Opens the filter drawer on mobile. */
  onOpenFilters: () => void;
  /** Count of active filters, shown on the mobile trigger. */
  activeCount: number;
  view: ResultsView;
  onViewChange: (view: ResultsView) => void;
  /** Optional control rendered before the filter/sort group (e.g. "Help me choose"). */
  action?: ReactNode;
}

const VIEWS: { key: ResultsView; label: string; icon: typeof Map }[] = [
  { key: "grid", label: "Grid", icon: LayoutGrid },
  { key: "map", label: "Map", icon: Map },
];

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
  view,
  onViewChange,
  action,
}: ListingResultsBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      {/* Live so the count is announced as filters, radius or view change. */}
      <p aria-live="polite" className="text-sm text-body">
        Showing <span className="font-semibold text-ink">{total}</span>{" "}
        {total === 1 ? "result" : "results"}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        {action}

        <div
          role="group"
          aria-label="Results view"
          className="inline-flex h-11 items-center rounded-field border border-line p-1"
        >
          {VIEWS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => onViewChange(key)}
              aria-pressed={view === key}
              className={cn(
                "inline-flex h-full items-center gap-1.5 rounded-field px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                view === key
                  ? "bg-primary text-white"
                  : "text-body hover:text-primary",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

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
