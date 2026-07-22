"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Label rendered beside the box. Accepts nodes for rich labels/links. */
  label?: ReactNode;
  /** Helper text under the label. */
  hint?: string;
  wrapperClassName?: string;
}

/**
 * Checkbox — an accessible custom-styled checkbox. The native input stays in the
 * DOM (visually hidden via `peer`) so keyboard, focus and form semantics all
 * work; the visible box is driven by `peer-checked`/`peer-focus-visible`.
 * Forwards its ref for React Hook Form.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox({ label, hint, wrapperClassName, id, className, ...props }, ref) {
    const autoId = useId();
    const inputId = id ?? autoId;

    return (
      <div className={cn("flex gap-2.5", wrapperClassName)}>
        <span className="relative flex h-5 items-center">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            className={cn(
              "peer size-5 shrink-0 cursor-pointer appearance-none rounded-sm border border-line bg-surface transition-colors checked:border-primary checked:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50",
              className,
            )}
            {...props}
          />
          <Check
            className="pointer-events-none absolute left-0.5 size-4 text-white opacity-0 peer-checked:opacity-100"
            strokeWidth={3}
            aria-hidden="true"
          />
        </span>
        {(label || hint) && (
          <span className="flex flex-col">
            {label && (
              <label
                htmlFor={inputId}
                className="cursor-pointer text-sm leading-5 text-ink"
              >
                {label}
              </label>
            )}
            {hint && <span className="text-xs text-muted">{hint}</span>}
          </span>
        )}
      </div>
    );
  },
);
