import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Dashboard-shaped loading skeletons built on the shared {@link Skeleton}
 * primitive. They mirror the layout of the content they stand in for so the
 * page doesn't shift when data arrives. All are `aria-hidden` via Skeleton.
 */

/** StatCardSkeleton — placeholder for a KPI card. */
export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-card border border-line bg-surface p-5 shadow-card",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <Skeleton variant="text" className="w-24" />
        <Skeleton variant="rect" className="size-9 rounded-field" />
      </div>
      <Skeleton variant="text" className="mt-4 h-7 w-20" />
      <Skeleton variant="text" className="mt-2 w-28" />
    </div>
  );
}

/** CardSkeleton — placeholder for a generic content panel. */
export function CardSkeleton({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-card border border-line bg-surface p-5 shadow-card",
        className,
      )}
    >
      <Skeleton variant="text" className="h-5 w-40" />
      <div className="mt-4 flex flex-col gap-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            variant="text"
            className={cn(i === lines - 1 && "w-2/3")}
          />
        ))}
      </div>
    </div>
  );
}

/** ChartSkeleton — placeholder bars for a chart panel. */
export function ChartSkeleton({ className }: { className?: string }) {
  const bars = [60, 40, 80, 55, 70, 35, 90, 50];
  return (
    <div
      className={cn(
        "rounded-card border border-line bg-surface p-5 shadow-card",
        className,
      )}
    >
      <Skeleton variant="text" className="h-5 w-40" />
      <div className="mt-6 flex h-40 items-end gap-3" aria-hidden="true">
        {bars.map((h, i) => (
          <div
            key={i}
            // Heights are decorative; fixed values keep SSR/CSR output stable.
            style={{ height: `${h}%` }}
            className="flex-1 animate-pulse rounded-field bg-surface-muted"
          />
        ))}
      </div>
    </div>
  );
}

/** FormSkeleton — placeholder for a stack of form fields. */
export function FormSkeleton({
  fields = 4,
  className,
}: {
  fields?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-5", className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton variant="text" className="w-28" />
          <Skeleton variant="rect" className="h-11 rounded-field" />
        </div>
      ))}
    </div>
  );
}

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

/** TableSkeleton — placeholder header + rows matching a {@link DataTable}. */
export function TableSkeleton({
  rows = 6,
  columns = 4,
  className,
}: TableSkeletonProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-card border border-line bg-surface",
        className,
      )}
    >
      <div className="flex gap-4 border-b border-line bg-surface-muted px-5 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} variant="text" className="h-3 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-line">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 px-5 py-4">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton
                key={c}
                variant="text"
                className={cn("flex-1", c === 0 && "max-w-[40%]")}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
