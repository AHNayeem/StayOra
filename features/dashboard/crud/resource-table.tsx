"use client";

import { type ReactNode } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { flexRender, type Table } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState, ErrorState } from "../components/state-views";
import { TableSkeleton } from "../ui/skeletons";

const alignMap = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
} as const;

interface ResourceTableProps<T> {
  /** A TanStack table instance, typically from {@link useResourceList}. */
  table: Table<T>;
  /** Accessible caption (visually hidden). */
  caption?: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  /** Rendered when there are no rows and not loading. Defaults to <EmptyState />. */
  emptyState?: ReactNode;
  onRowClick?: (row: T) => void;
  /** Show the leading selection column when the table allows row selection. */
  selectable?: boolean;
  stickyHeader?: boolean;
  density?: "comfortable" | "compact";
  className?: string;
}

/**
 * ResourceTable — the TanStack-connected table for data modules.
 *
 * It is the "headed" counterpart to the presentational {@link
 * import("../ui/data-table").DataTable}: TanStack owns the state (sorting,
 * selection, column visibility) via {@link useResourceList}, and this component
 * renders it with `flexRender` using the exact same design tokens. Built-in
 * loading / error / empty states keep it consistent with the rest of the shell.
 */
export function ResourceTable<T>({
  table,
  caption,
  loading = false,
  error = null,
  onRetry,
  emptyState,
  onRowClick,
  selectable = false,
  stickyHeader = false,
  density = "comfortable",
  className,
}: ResourceTableProps<T>) {
  const showSelect = selectable && table.options.enableRowSelection !== false;
  const leafCount = table.getVisibleLeafColumns().length + (showSelect ? 1 : 0);
  const cellPad = density === "compact" ? "px-4 py-2" : "px-4 py-3.5";
  const rows = table.getRowModel().rows;

  if (loading) {
    return <TableSkeleton columns={leafCount || 4} className={className} />;
  }
  if (error) {
    return <ErrorState description={error} onRetry={onRetry} />;
  }
  if (rows.length === 0) {
    return <>{emptyState ?? <EmptyState />}</>;
  }

  return (
    <div
      className={cn(
        "w-full overflow-x-auto rounded-card border border-line bg-surface",
        className,
      )}
    >
      <table className="w-full border-collapse text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className={cn("bg-surface-muted", stickyHeader && "sticky top-0 z-10")}>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-line">
              {showSelect && (
                <th scope="col" className="w-px px-4 py-3">
                  <Checkbox
                    aria-label="Select all rows on this page"
                    checked={table.getIsAllPageRowsSelected()}
                    ref={(el) => {
                      if (el)
                        el.indeterminate =
                          table.getIsSomePageRowsSelected() &&
                          !table.getIsAllPageRowsSelected();
                    }}
                    onChange={table.getToggleAllPageRowsSelectedHandler()}
                  />
                </th>
              )}
              {headerGroup.headers.map((header) => {
                const { column } = header;
                const meta = column.columnDef.meta;
                const align = meta?.align ?? "left";
                const canSort = column.getCanSort();
                const sorted = column.getIsSorted();
                return (
                  <th
                    key={header.id}
                    scope="col"
                    aria-sort={
                      sorted === "asc"
                        ? "ascending"
                        : sorted === "desc"
                          ? "descending"
                          : undefined
                    }
                    className={cn(
                      "px-4 py-3 text-xs font-semibold tracking-wide text-muted uppercase",
                      alignMap[align],
                      meta?.widthClass,
                      meta?.headerClassName,
                    )}
                  >
                    {header.isPlaceholder ? null : canSort ? (
                      <button
                        type="button"
                        onClick={column.getToggleSortingHandler()}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-field transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                          align === "right" && "flex-row-reverse",
                          sorted && "text-ink",
                        )}
                      >
                        {flexRender(column.columnDef.header, header.getContext())}
                        {sorted === "asc" ? (
                          <ChevronUp className="size-3.5" aria-hidden="true" />
                        ) : sorted === "desc" ? (
                          <ChevronDown className="size-3.5" aria-hidden="true" />
                        ) : (
                          <ChevronsUpDown
                            className="size-3.5 opacity-50"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    ) : (
                      flexRender(column.columnDef.header, header.getContext())
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => {
            const isSelected = row.getIsSelected();
            return (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                className={cn(
                  "transition-colors",
                  isSelected ? "bg-primary-50" : "hover:bg-surface-muted",
                  onRowClick && "cursor-pointer",
                )}
              >
                {showSelect && (
                  <td className="w-px px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      aria-label="Select row"
                      checked={isSelected}
                      disabled={!row.getCanSelect()}
                      onChange={row.getToggleSelectedHandler()}
                    />
                  </td>
                )}
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta;
                  return (
                    <td
                      key={cell.id}
                      className={cn(
                        cellPad,
                        "text-body align-middle",
                        alignMap[meta?.align ?? "left"],
                        meta?.cellClassName,
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
