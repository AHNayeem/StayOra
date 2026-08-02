import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * FlightResultsSkeleton — the streaming fallback for the results page.
 *
 * Shaped like the real thing (summary bar, filter rail, result cards) rather
 * than a generic spinner, so the layout doesn't jump when fares arrive and the
 * wait reads as "loading these results" instead of "loading something".
 */
export function FlightResultsSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Searching for flights…</span>

      {/* Summary bar */}
      <div className="border-b border-line bg-surface-muted/60">
        <Container className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-4 w-72" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-28 rounded-pill" />
              <Skeleton className="h-9 w-28 rounded-pill" />
            </div>
          </div>
        </Container>
      </div>

      <Container className="py-6 md:py-8">
        <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start">
          {/* Filter rail */}
          <aside className="hidden lg:block">
            <div className="space-y-6 rounded-card border border-line bg-surface p-5">
              {[0, 1, 2, 3].map((group) => (
                <div key={group} className="space-y-2.5">
                  <Skeleton className="h-4 w-24" />
                  {[0, 1, 2].map((row) => (
                    <div key={row} className="flex items-center gap-2.5">
                      <Skeleton variant="rect" className="size-5 rounded-sm" />
                      <Skeleton className="h-4 flex-1" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </aside>

          {/* Results */}
          <div className="min-w-0 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-9 w-52 rounded-field" />
            </div>

            {[0, 1, 2, 3, 4].map((card) => (
              <div
                key={card}
                className="grid gap-4 rounded-card border border-line bg-surface p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-6"
              >
                <div className="min-w-0 space-y-4">
                  <div className="flex items-center gap-3">
                    <Skeleton variant="rect" className="size-8 rounded-field" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="space-y-1.5">
                      <Skeleton className="h-5 w-14" />
                      <Skeleton className="h-3 w-9" />
                    </div>
                    <Skeleton className="h-px flex-1" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-5 w-14" />
                      <Skeleton className="h-3 w-9" />
                    </div>
                  </div>
                  <div className="flex gap-4 border-t border-line pt-3">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
                <div className="flex items-end justify-between gap-3 border-t border-line pt-4 lg:w-52 lg:flex-col lg:items-stretch lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                  <div className="space-y-1.5">
                    <Skeleton className="h-7 w-28" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-11 w-28 rounded-pill lg:w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </div>
  );
}
