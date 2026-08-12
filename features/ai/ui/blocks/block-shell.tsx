"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { AiText } from "./ai-text";

/**
 * BlockShell — the frame every rich result shares: a titled, bordered panel
 * with an optional note and a "see all" link. Keeping the chrome in one place
 * is what makes eleven different block types read as one assistant rather than
 * eleven widgets.
 */
export function BlockShell({
  title,
  note,
  moreHref,
  moreLabel = "See all",
  action,
  children,
  className,
}: {
  title?: string;
  note?: string;
  moreHref?: string;
  moreLabel?: string;
  /** Extra control rendered beside the title (e.g. "Compare these"). */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-card border border-line bg-surface",
        className,
      )}
    >
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          {title && <h3 className="text-sm font-semibold text-ink">{title}</h3>}
          <div className="flex items-center gap-3">
            {action}
            {moreHref && (
              <Link
                href={moreHref}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                {moreLabel}
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            )}
          </div>
        </header>
      )}
      {note && (
        <p className="border-b border-line bg-surface-muted px-4 py-2 text-xs text-body">
          <AiText text={note} />
        </p>
      )}
      {children}
    </section>
  );
}
