import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccountEmptyProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * AccountEmpty — the shared empty state for account lists (no bookings yet, no
 * wishlist items, etc.). Consistent with the public site's visual language.
 */
export function AccountEmpty({
  icon: Icon,
  title,
  description,
  action,
  className,
}: AccountEmptyProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-line bg-surface px-6 py-16 text-center",
        className,
      )}
    >
      <span className="grid size-14 place-items-center rounded-full bg-surface-muted text-muted">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {description && <p className="max-w-md text-sm text-body">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
