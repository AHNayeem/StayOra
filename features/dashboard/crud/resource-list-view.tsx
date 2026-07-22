"use client";

import { type ReactNode } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { getErrorMessage } from "../data/errors";
import type { ID } from "../data/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownLabel,
} from "../ui/dropdown-menu";
import { FilterBar, FilterChips, type ActiveFilter } from "../ui/filter-bar";
import { TablePagination } from "../ui/table-pagination";
import { ResourceTable } from "./resource-table";
import type { UseResourceListResult } from "./use-resource-list";

interface ResourceListViewProps<T> {
  /** The list engine from {@link useResourceList}. */
  list: UseResourceListResult<T>;
  searchPlaceholder?: string;
  /** Hide the search box (e.g. for tiny reference tables). */
  hideSearch?: boolean;
  /** Filter controls slotted into the toolbar (selects, dropdowns…). */
  filterControls?: ReactNode;
  /** Right-aligned primary action, e.g. an "Add" button. */
  primaryAction?: ReactNode;
  /** Applied-filter chips shown under the toolbar. */
  activeFilters?: ActiveFilter[];
  /** Remove one filter chip. Defaults to clearing that filter key. */
  onRemoveFilter?: (key: string) => void;
  /** Bulk actions rendered when rows are selected; receives selected ids. */
  bulkActions?: (ids: ID[]) => ReactNode;
  onRowClick?: (row: T) => void;
  caption?: string;
  emptyState?: ReactNode;
  /** Show selection checkboxes. Default true. */
  selectable?: boolean;
  /** Show the column-visibility menu. Default true. */
  enableColumnVisibility?: boolean;
  density?: "comfortable" | "compact";
}

/**
 * ResourceListView — the reusable list surface every data module renders.
 *
 * It composes the toolbar (search + filters + column visibility + primary
 * action), applied-filter chips, a selection/bulk-action bar, the
 * {@link ResourceTable} and its {@link TablePagination} — all driven by a single
 * {@link useResourceList} result. Modules supply only columns, a service and any
 * bespoke filter controls; everything else is consistent by construction.
 */
export function ResourceListView<T>({
  list,
  searchPlaceholder = "Search…",
  hideSearch = false,
  filterControls,
  primaryAction,
  activeFilters,
  onRemoveFilter,
  bulkActions,
  onRowClick,
  caption,
  emptyState,
  selectable = true,
  enableColumnVisibility = true,
  density,
}: ResourceListViewProps<T>) {
  const { query, table } = list;
  const errorMessage =
    query.isError && query.error ? getErrorMessage(query.error) : null;

  const hideableColumns = table
    .getAllLeafColumns()
    .filter((column) => column.getCanHide());

  const columnMenu =
    enableColumnVisibility && hideableColumns.length > 0 ? (
      <DropdownMenu
        label="Toggle columns"
        trigger={({ props }) => (
          <Button type="button" variant="outline" size="sm" {...props}>
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Columns
          </Button>
        )}
      >
        <DropdownLabel>Visible columns</DropdownLabel>
        <div className="flex flex-col gap-0.5 p-1" role="group" aria-label="Columns">
          {hideableColumns.map((column) => {
            const label = column.columnDef.meta?.label ?? column.id;
            return (
              <label
                key={column.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-field px-2 py-1.5 text-sm text-body hover:bg-surface-muted"
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={column.getIsVisible()}
                  onChange={(e) => column.toggleVisibility(e.target.checked)}
                />
                <span className="capitalize">{label}</span>
              </label>
            );
          })}
        </div>
      </DropdownMenu>
    ) : null;

  const hasToolbar =
    !hideSearch || filterControls || columnMenu || primaryAction;

  return (
    <div className="flex flex-col gap-4">
      {hasToolbar && (
        <FilterBar
          search={hideSearch ? undefined : list.search}
          onSearchChange={hideSearch ? undefined : list.setSearch}
          searchPlaceholder={searchPlaceholder}
          actions={
            (columnMenu || primaryAction) && (
              <>
                {columnMenu}
                {primaryAction}
              </>
            )
          }
        >
          {filterControls}
        </FilterBar>
      )}

      {activeFilters && activeFilters.length > 0 && (
        <FilterChips
          filters={activeFilters}
          onRemove={onRemoveFilter ?? ((key) => list.setFilter(key, ""))}
          onClear={list.resetFilters}
        />
      )}

      {selectable && bulkActions && list.selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface-muted px-4 py-2.5">
          <span className="text-sm font-medium text-ink">
            {list.selectedIds.length} selected
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {bulkActions(list.selectedIds)}
          </div>
          <button
            type="button"
            onClick={list.clearSelection}
            className="ml-auto inline-flex items-center gap-1 rounded-field px-2 py-1 text-xs font-medium text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <X className="size-3.5" aria-hidden="true" />
            Clear
          </button>
        </div>
      )}

      <ResourceTable
        table={table}
        loading={query.isLoading}
        error={errorMessage}
        onRetry={query.refetch}
        emptyState={emptyState}
        onRowClick={onRowClick}
        selectable={selectable}
        caption={caption}
        density={density}
      />

      <TablePagination
        page={list.page}
        pageSize={list.pageSize}
        total={list.total}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
      />
    </div>
  );
}
