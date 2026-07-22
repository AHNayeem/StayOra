import { cn } from "@/lib/utils";
import type { ElementType, ReactNode } from "react";

interface ContainerProps {
  children: ReactNode;
  className?: string;
  /** Render as a different element (e.g. "section", "header"). Default "div". */
  as?: ElementType;
}

/**
 * Container — centers content at the site max-width (1320px) with responsive
 * gutters. The single source of horizontal alignment across the app.
 */
export function Container({ children, className, as }: ContainerProps) {
  const Component = as ?? "div";
  return (
    <Component
      className={cn(
        "mx-auto w-full max-w-[var(--container-site)] px-4 sm:px-6 lg:px-8",
        className,
      )}
    >
      {children}
    </Component>
  );
}
