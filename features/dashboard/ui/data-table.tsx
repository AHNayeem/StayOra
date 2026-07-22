"use client";

import { type ReactNode } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState, ErrorState } from "../components/state-views";
import { TableSkeleton } from "./skeletons";

export type SortDir = "asc" | "desc";
export interface SortState {
  key: string;
  dir: SortDir;
}

export interface ColumnDef<T> {
  /** Stable column id. */
  id: string;
  header: ReactNode;
  /** Cell renderer for a row. */
  cell: (row: T) => ReactNode;
  align?: "left" | "center" | "right";
  /** Enable a sort toggle on this column's header. */
  sortable?: boolean;
  /** Sort key sent to `onSortChange`; defaults to `id`. */
  sortKey?: string;
  /** Width utility, e.g. "w-40" or "w-px" for tight action columns. */
  width?: string;
  headerClassName?: string;
  cellClassName?: string;
  /** Hide the column (e.g. via a column-visibility toggle). */
  hidden?: boolean;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  rows: T[];
  /** Stable id per row (for keys and selection). */
  getRowId: (row: T) => string;
  /** Accessible table caption (visually hidden). */
  caption?: string;

  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  /** Shown when there are no rows and not loading. Defaults to <EmptyState />. */
  emptyState?: ReactNode;

  /** Controlled sort state + handler. */
  sort?: SortState | null;
  onSortChange?: (key: string) => void;

  /** Controlled row selection. */
  selectable?: boolean;
  selectedIds?: string[];
  onSelectedIdsChange?: (ids: string[]) => void;

  onRowClick?: (row: T) => void;
  stickyHeader?: boolean;
  density?: "comfortable" | "compact";
  className?: string;
}

const alignMap = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
} as const;

/**
 * DataTable — a presentational, generic table with sorting, row selection,
 * sticky header, responsive horizontal scroll and built-in loading / error /
 * empty states. It fetches nothing: pass rows, column defs and controlled
 * sort/selection state. A TanStack-backed adapter can layer on top later without
 * changing this surface.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  caption,
  loading = false,
  error = null,
  onRetry,
  emptyState,
  sort = null,
  onSortChange,
  selectable = false,
  selectedIds = [],
  onSelectedIdsChange,
  onRowClick,
  stickyHeader = false,
  density = "comfortable",
  className,
}: DataTableProps<T>) {
  const visibleColumns = columns.filter((c) => !c.hidden);
  const colSpan = visibleColumns.length + (selectable ? 1 : 0);
  const cellPad = density === "compact" ? "px-4 py-2" : "px-4 py-3.5";

  if (loading) {
    return <TableSkeleton columns={colSpan} className={className} />;
  }
  if (error) {
    return <ErrorState description={error} onRetry={onRetry} />;
  }
  if (rows.length === 0) {
    return <>{emptyState ?? <EmptyState />}</>;
  }

  const selected = new Set(selectedIds);
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(getRowId(r)));
  const someSelected = rows.some((r) => selected.has(getRowId(r)));

  const toggleAll = () => {
    if (!onSelectedIdsChange) return;
    onSelectedIdsChange(allSelected ? [] : rows.map(getRowId));
  };

  const toggleRow = (id: string) => {
    if (!onSelectedIdsChange) return;
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectedIdsChange([...next]);
  };

  return (
    <div
      className={cn(
        "w-full overflow-x-auto rounded-card border border-line bg-surface",
        className,
      )}
    >
      <table className="w-full border-collapse text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead
          className={cn(
            "bg-surface-muted",
            stickyHeader && "sticky top-0 z-10",
          )}
        >
          <tr className="border-b border-line">
            {selectable && (
              <th scope="col" className="w-px px-4 py-3">
                <Checkbox
                  aria-label="Select all rows"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected && !allSelected;
                  }}
                  onChange={toggleAll}
                />
              </th>
            )}
            {visibleColumns.map((col) => {
              const key = col.sortKey ?? col.id;
              const isSorted = sort?.key === key;
              const sortable = col.sortable && onSortChange;
              return (
                <th
                  key={col.id}
                  scope="col"
                  aria-sort={
                    isSorted
                      ? sort?.dir === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                  className={cn(
                    "px-4 py-3 text-xs font-semibold tracking-wide text-muted uppercase",
                    alignMap[col.align ?? "left"],
                    col.width,
                    col.headerClassName,
                  )}
                >
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => onSortChange(key)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-field transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                        col.align === "right" && "flex-row-reverse",
                        isSorted && "text-ink",
                      )}
                    >
                      {col.header}
                      {isSorted ? (
                        sort?.dir === "asc" ? (
                          <ChevronUp className="size-3.5" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="size-3.5" aria-hidden="true" />
                        )
                      ) : (
                        <ChevronsUpDown
                          className="size-3.5 opacity-50"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => {
            const id = getRowId(row);
            const isSelected = selected.has(id);
            return (
              <tr
                key={id}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "transition-colors",
                  isSelected ? "bg-primary-50" : "hover:bg-surface-muted",
                  onRowClick && "cursor-pointer",
                )}
              >
                {selectable && (
                  <td
                    className="w-px px-4 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      aria-label="Select row"
                      checked={isSelected}
                      onChange={() => toggleRow(id)}
                    />
                  </td>
                )}
                {visibleColumns.map((col) => (
                  <td
                    key={col.id}
                    className={cn(
                      cellPad,
                      "text-body align-middle",
                      alignMap[col.align ?? "left"],
                      col.cellClassName,
                    )}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
