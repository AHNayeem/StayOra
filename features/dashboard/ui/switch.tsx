"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SwitchProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  /** Label rendered beside the switch. */
  label?: ReactNode;
  /** Helper text under the label. */
  hint?: string;
  wrapperClassName?: string;
}

/**
 * Switch — an accessible on/off toggle for settings and feature flags. Uses a
 * visually-hidden native checkbox (via `peer`) so keyboard, focus and form
 * semantics work for free, with the track/thumb driven by `peer-checked`.
 * Forwards its ref for React Hook Form's `register()`.
 */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { label, hint, wrapperClassName, id, className, disabled, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div className={cn("flex items-start gap-3", wrapperClassName)}>
      <span className="relative inline-flex h-6 items-center">
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          role="switch"
          disabled={disabled}
          className={cn(
            "peer size-0 opacity-0",
            // The visible track is the sibling <span>; this input carries focus.
            className,
          )}
          {...props}
        />
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none h-6 w-11 rounded-pill bg-line transition-colors",
            "peer-checked:bg-primary",
            "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary",
            "peer-disabled:opacity-50",
          )}
        />
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute left-0.5 size-5 rounded-full bg-surface shadow-card transition-transform",
            "peer-checked:translate-x-5",
          )}
        />
      </span>
      {(label || hint) && (
        <span className="flex flex-col">
          {label && (
            <label
              htmlFor={inputId}
              className={cn(
                "text-sm leading-6 text-ink",
                disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
              )}
            >
              {label}
            </label>
          )}
          {hint && <span className="text-xs text-muted">{hint}</span>}
        </span>
      )}
    </div>
  );
});
