import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  /** Current page, 1-based. */
  page: number;
  /** Total number of pages. */
  pageCount: number;
  onPageChange: (page: number) => void;
  /** Pages shown either side of the current page. Default 1. */
  siblingCount?: number;
  className?: string;
}

const ELLIPSIS = "…";
type PageItem = number | typeof ELLIPSIS;

/**
 * Build the page list with leading/trailing ellipses. Always shows the first
 * and last page plus `siblingCount` neighbours around the current page.
 */
function buildRange(
  page: number,
  pageCount: number,
  siblingCount: number,
): PageItem[] {
  // Show every page when there's little to collapse.
  const totalSlots = siblingCount * 2 + 5;
  if (pageCount <= totalSlots) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }

  const left = Math.max(page - siblingCount, 1);
  const right = Math.min(page + siblingCount, pageCount);
  const showLeftDots = left > 2;
  const showRightDots = right < pageCount - 1;

  const items: PageItem[] = [1];
  if (showLeftDots) items.push(ELLIPSIS);
  for (let p = showLeftDots ? left : 2; p <= (showRightDots ? right : pageCount - 1); p++) {
    items.push(p);
  }
  if (showRightDots) items.push(ELLIPSIS);
  items.push(pageCount);
  return items;
}

/**
 * Pagination — a controlled page navigator with prev/next arrows and collapsed
 * page numbers (ellipses for large ranges). Renders nothing for a single page.
 */
export function Pagination({
  page,
  pageCount,
  onPageChange,
  siblingCount = 1,
  className,
}: PaginationProps) {
  if (pageCount <= 1) return null;

  const items = buildRange(page, pageCount, siblingCount);

  const arrow =
    "grid size-10 place-items-center rounded-full border border-line text-ink transition-colors hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-40";

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center justify-center gap-1.5", className)}
    >
      <button
        type="button"
        className={arrow}
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </button>

      {items.map((item, i) =>
        item === ELLIPSIS ? (
          <span
            key={`dots-${i}`}
            className="grid size-10 place-items-center text-muted"
            aria-hidden="true"
          >
            {ELLIPSIS}
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            aria-current={item === page ? "page" : undefined}
            className={cn(
              "grid size-10 place-items-center rounded-full text-sm font-semibold transition-colors",
              item === page
                ? "bg-primary text-white"
                : "text-ink hover:bg-surface-muted",
            )}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        className={arrow}
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pageCount}
        aria-label="Next page"
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </nav>
  );
}
