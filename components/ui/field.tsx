import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface FieldOwnProps {
  /** Visible field label. */
  label?: string;
  /** Helper text shown below the control. */
  hint?: string;
  /** Error message; overrides the hint and flags the control invalid. */
  error?: string;
  /** Mark the field as required (adds an asterisk to the label). */
  required?: boolean;
  /** Wrapper className. */
  wrapperClassName?: string;
}

/**
 * Shared visual for form base styling — the border/height/focus treatment every
 * text control uses. Exposed so Input, Textarea and Select stay pixel-identical.
 */
export function controlClasses(hasError: boolean, className?: string): string {
  return cn(
    "w-full rounded-field border bg-surface px-3.5 text-sm text-ink transition-colors placeholder:text-muted focus:outline-none focus:ring-3 focus:ring-primary/25 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70",
    hasError
      ? "border-danger focus:border-danger focus:ring-danger/20"
      : "border-line focus:border-primary",
    className,
  );
}

interface FieldWrapperProps extends FieldOwnProps {
  /** id of the control this label/messages describe. */
  htmlFor: string;
  children: ReactNode;
}

/**
 * FieldWrapper — renders a label, the control, and a hint or error message with
 * consistent spacing and accessible wiring. Text controls compose this so the
 * label/hint/error treatment lives in one place.
 */
export function FieldWrapper({
  htmlFor,
  label,
  hint,
  error,
  required,
  wrapperClassName,
  children,
}: FieldWrapperProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", wrapperClassName)}>
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
          {label}
          {required && (
            <span className="ml-0.5 text-danger" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
