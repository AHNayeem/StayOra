import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

/** Checkout loading skeleton — mirrors the form + order-summary two-column layout. */
export default function CheckoutLoading() {
  return (
    <Container className="py-8 md:py-10">
      <div className="mb-6 space-y-4">
        <Skeleton variant="text" className="h-4 w-28" />
        <Skeleton variant="text" className="h-8 w-48" />
        <Skeleton className="h-8 w-full max-w-md" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-card border border-line bg-surface p-5 shadow-card">
              <Skeleton variant="text" className="mb-4 h-5 w-40" />
              <div className="space-y-3">
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-panel border border-line bg-surface p-5 shadow-card">
          <div className="flex gap-3">
            <Skeleton className="size-20 shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
              <Skeleton variant="text" className="h-3 w-16" />
              <Skeleton variant="text" className="h-4 w-full" />
              <Skeleton variant="text" className="h-3 w-24" />
            </div>
          </div>
          <div className="mt-4 space-y-2 border-t border-line pt-4">
            <Skeleton variant="text" className="h-4 w-full" />
            <Skeleton variant="text" className="h-4 w-full" />
            <Skeleton variant="text" className="h-6 w-full" />
          </div>
        </div>
      </div>
    </Container>
  );
}
