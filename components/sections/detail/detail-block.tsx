import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DetailBlockProps {
  /** Anchor id, so the block can be linked to (and offset below the sticky header). */
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

/**
 * DetailBlock — the shared wrapper for every content section on a details page:
 * a consistent left-aligned heading + optional lede over the block body. Keeps
 * spacing and typography identical across overview, facts, itinerary, etc.
 */
export function DetailBlock({
  id,
  title,
  description,
  children,
  className,
}: DetailBlockProps) {
  return (
    <section id={id} className={cn("scroll-mt-28", className)}>
      <h2 className="text-h3">{title}</h2>
      {description && <p className="mt-2 text-body">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}
