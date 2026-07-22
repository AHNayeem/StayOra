import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PanelProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  /** Remove the inner padding (e.g. when wrapping a full-bleed table). */
  flush?: boolean;
}

/**
 * Panel — the dashboard surface primitive: a bordered, elevated container for
 * grouping content (unlike the marketing Card, no media zoom or hover-lift).
 * Compose with {@link PanelHeader}, {@link PanelBody} and {@link PanelFooter},
 * or drop children straight in. Presentation-only.
 */
export function Panel({ children, className, as, flush = false }: PanelProps) {
  const Component = as ?? "section";
  return (
    <Component
      className={cn(
        "flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card",
        !flush && "p-5",
        className,
      )}
    >
      {children}
    </Component>
  );
}

interface PanelHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Right-aligned actions (buttons, menus, filters). */
  actions?: ReactNode;
  /** Heading level for the title. Default h2. */
  as?: ElementType;
  className?: string;
}

/** PanelHeader — title/description on the left, actions on the right. */
export function PanelHeader({
  title,
  description,
  actions,
  as,
  className,
}: PanelHeaderProps) {
  const Heading = as ?? "h2";
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <Heading className="truncate text-base font-semibold text-ink">
          {title}
        </Heading>
        {description && (
          <p className="mt-0.5 text-sm text-body">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

/** PanelBody — padded content region (pair with a flush Panel). */
export function PanelBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("p-5", className)}>{children}</div>;
}

/** PanelFooter — bottom action row, separated by a hairline. */
export function PanelFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-2 border-t border-line px-5 py-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
