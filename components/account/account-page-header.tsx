import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccountPageHeaderProps {
  title: string;
  description?: string;
  /** Right-aligned actions (buttons, filters). */
  actions?: ReactNode;
  /** Optional "back" link rendered above the title. */
  back?: { href: string; label: string };
  className?: string;
}

/**
 * AccountPageHeader — the consistent title block at the top of every account
 * page: an optional back link, the heading + supporting copy, and a slot for
 * page-level actions.
 */
export function AccountPageHeader({
  title,
  description,
  actions,
  back,
  className,
}: AccountPageHeaderProps) {
  return (
    <div className={cn("mb-6", className)}>
      {back && (
        <Link
          href={back.href}
          className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted transition-colors hover:text-primary"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-h3 text-ink">{title}</h1>
          {description && <p className="mt-1 text-body">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
