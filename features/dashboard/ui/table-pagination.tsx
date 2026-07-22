"use client";

import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

interface TablePaginationProps {
  /** Current page, 1-based. */
  page: number;
  /** Rows per page. */
  pageSize: number;
  /** Total row count across all pages. */
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

/**
 * TablePagination — the footer under a {@link DataTable}: a "Showing X–Y of Z"
 * summary, an optional page-size selector, and the shared {@link Pagination}
 * control. Fully controlled and presentation-only.
 */
export function TablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  className,
}: TablePaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex items-center gap-4 text-sm text-body">
        <p aria-live="polite">
          Showing <span className="font-medium text-ink">{from}</span>–
          <span className="font-medium text-ink">{to}</span> of{" "}
          <span className="font-medium text-ink">{total}</span>
        </p>
        {onPageSizeChange && (
          <label className="hidden items-center gap-2 sm:flex">
            <span className="text-muted">Per page</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-9 cursor-pointer rounded-field border border-line bg-surface px-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/25"
              aria-label="Rows per page"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <Pagination
        page={page}
        pageCount={pageCount}
        onPageChange={onPageChange}
        className="justify-end"
      />
    </div>
  );
}
