import Link from "next/link";
import { AlertTriangle, RotateCw } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  /** Wire to `unstable_retry` inside an error boundary. */
  onRetry?: () => void;
  /** Show a link home alongside the retry button. */
  homeHref?: string;
  className?: string;
}

/**
 * ErrorState — the shared fallback for route error boundaries and failed data
 * loads: an icon, message, and an optional retry / go-home pair. Presentational
 * so it can be dropped into any `error.tsx` (passing `unstable_retry`).
 */
export function ErrorState({
  icon: Icon = AlertTriangle,
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try again — if it keeps happening, come back in a little while.",
  onRetry,
  homeHref,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center",
        className,
      )}
    >
      <span className="grid size-14 place-items-center rounded-full bg-danger/10 text-danger">
        <Icon className="size-7" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-xl font-bold text-ink">{title}</h1>
      <p className="mt-2 text-body">{description}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {onRetry && (
          <Button variant="primary" size="md" onClick={onRetry}>
            <RotateCw className="size-4" aria-hidden="true" />
            Try again
          </Button>
        )}
        {homeHref && (
          <Link href={homeHref} className={buttonVariants({ variant: "outline", size: "md" })}>
            Go home
          </Link>
        )}
      </div>
    </div>
  );
}
