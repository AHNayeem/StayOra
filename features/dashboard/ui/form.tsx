import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Form layout primitives. These are presentation-only building blocks — they
 * arrange labelled controls (Input, Select, Switch…) into sections and grids
 * with consistent spacing. They stay agnostic of the form library: wire values
 * and validation with React Hook Form at the call site (the controls already
 * forward refs for `register()`). The data/validation layer arrives in Phase 3.
 */

interface FormSectionProps {
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** FormSection — a titled group of fields, divided from the next section. */
export function FormSection({
  title,
  description,
  children,
  className,
}: FormSectionProps) {
  return (
    <section
      className={cn(
        "grid gap-6 border-b border-line py-6 first:pt-0 last:border-b-0 lg:grid-cols-[16rem_1fr]",
        className,
      )}
    >
      {(title || description) && (
        <div className="lg:pr-6">
          {title && <h3 className="text-sm font-semibold text-ink">{title}</h3>}
          {description && (
            <p className="mt-1 text-sm text-body">{description}</p>
          )}
        </div>
      )}
      <div className="flex flex-col gap-5">{children}</div>
    </section>
  );
}

type GridCols = 1 | 2 | 3;

const colsMap: Record<GridCols, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
};

/** FormGrid — responsive multi-column field grid (single column on mobile). */
export function FormGrid({
  cols = 2,
  children,
  className,
}: {
  cols?: GridCols;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-4", colsMap[cols], className)}>
      {children}
    </div>
  );
}

/** FormRow — a labelled inline row (label left, control right) for settings. */
export function FormRow({
  label,
  hint,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{label}</p>
        {hint && <p className="mt-0.5 text-sm text-body">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/** FormActions — a right-aligned action row (Cancel / Save) at the form foot. */
export function FormActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-3 pt-6 sm:flex-row sm:items-center sm:justify-end",
        className,
      )}
    >
      {children}
    </div>
  );
}
