import type { ReactNode } from "react";
import Link from "next/link";
import { Ban, Inbox, Lock, SearchX, ServerCrash, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

interface StateViewProps {
  icon: ReactNode;
  title: string;
  description?: string;
  /** Optional call-to-action. */
  action?: ReactNode;
  tone?: "neutral" | "danger";
  className?: string;
}

/**
 * StateView — the shared centered layout behind every non-content state
 * (empty, no-results, permission-denied, error, offline…). Keeps these states
 * visually consistent across the whole dashboard, as the brief requires.
 */
export function StateView({
  icon,
  title,
  description,
  action,
  tone = "neutral",
  className,
}: StateViewProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-card border border-line bg-surface px-6 py-12 text-center",
        className,
      )}
    >
      <span
        className={cn(
          "grid size-14 place-items-center rounded-full",
          tone === "danger" ? "bg-danger/10 text-danger" : "bg-surface-muted text-muted",
        )}
      >
        {icon}
      </span>
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {description && (
        <p className="max-w-md text-sm text-body">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** No data yet. */
export function EmptyState({
  title = "Nothing here yet",
  description = "When data is available it will appear here.",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <StateView
      icon={<Inbox className="size-6" aria-hidden="true" />}
      title={title}
      description={description}
      action={action}
    />
  );
}

/** No results for the current filters/search. */
export function NoResults({ query }: { query?: string }) {
  return (
    <StateView
      icon={<SearchX className="size-6" aria-hidden="true" />}
      title="No results"
      description={
        query
          ? `Nothing matched “${query}”. Try adjusting your filters.`
          : "Try adjusting your filters or search terms."
      }
    />
  );
}

/** Access denied — used by permission guards. */
export function PermissionDenied({
  description = "You don't have permission to view this section. Contact an administrator if you think this is a mistake.",
}: {
  description?: string;
}) {
  return (
    <StateView
      tone="danger"
      icon={<Lock className="size-6" aria-hidden="true" />}
      title="Permission denied"
      description={description}
      action={
        <Link href="/dashboard" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Back to dashboard
        </Link>
      }
    />
  );
}

/** Feature disabled via feature flag. */
export function FeatureDisabled() {
  return (
    <StateView
      icon={<Ban className="size-6" aria-hidden="true" />}
      title="Feature unavailable"
      description="This feature isn't enabled for your workspace yet."
    />
  );
}

/** Offline / network error. */
export function OfflineState({ onRetry }: { onRetry?: () => void }) {
  return (
    <StateView
      icon={<WifiOff className="size-6" aria-hidden="true" />}
      title="You're offline"
      description="Check your connection and try again."
      action={
        onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Retry
          </button>
        )
      }
    />
  );
}

/** Generic server/error state (used by error.tsx boundaries). */
export function ErrorState({
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try again.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <StateView
      tone="danger"
      icon={<ServerCrash className="size-6" aria-hidden="true" />}
      title={title}
      description={description}
      action={
        onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className={buttonVariants({ variant: "primary", size: "sm" })}
          >
            Try again
          </button>
        )
      }
    />
  );
}
