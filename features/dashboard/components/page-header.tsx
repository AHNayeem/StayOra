import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Actions rendered on the right (buttons, filters). */
  actions?: ReactNode;
  /** Optional eyebrow/kicker above the title. */
  eyebrow?: string;
  className?: string;
}

/**
 * Standard page header for dashboard routes — title, optional description and a
 * right-aligned action slot. Wraps responsively so actions drop below the title
 * on narrow screens. Uses only semantic tokens.
 */
export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-primary">
            {eyebrow}
          </p>
        )}
        <h1 className="truncate text-2xl font-bold text-ink">{title}</h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-body">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
