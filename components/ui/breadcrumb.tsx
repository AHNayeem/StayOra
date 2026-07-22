import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  /** Link target. Omit on the current (last) item. */
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  /** Muted style for use over dark banners. */
  tone?: "default" | "onDark";
  className?: string;
}

/**
 * Breadcrumb — an accessible trail of links ending in the current page. The
 * last item renders as plain text with `aria-current="page"`. Used in page
 * banners and above listing/detail content.
 */
export function Breadcrumb({ items, tone = "default", className }: BreadcrumbProps) {
  const onDark = tone === "onDark";

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-sm">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className={cn(
                    "transition-colors",
                    onDark
                      ? "text-white/70 hover:text-white"
                      : "text-body hover:text-primary",
                  )}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={cn(
                    "font-medium",
                    onDark ? "text-white" : "text-ink",
                  )}
                >
                  {item.label}
                </span>
              )}
              {!isLast && (
                <ChevronRight
                  className={cn(
                    "size-4 shrink-0",
                    onDark ? "text-white/50" : "text-muted",
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
