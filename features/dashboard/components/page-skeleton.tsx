import { Skeleton } from "@/components/ui/skeleton";

/**
 * Generic loading skeleton for dashboard routes — a header stub plus a grid of
 * cards. Used by route-level `loading.tsx` files so navigation streams with a
 * consistent placeholder instead of a blank frame.
 */
export function PageSkeleton() {
  return (
    <div aria-hidden="true" className="animate-fade-in">
      <div className="flex items-end justify-between pb-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton variant="text" className="w-72" />
        </div>
        <Skeleton className="h-10 w-28 rounded-pill" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 lg:col-span-2" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}
