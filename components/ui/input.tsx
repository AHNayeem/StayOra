"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { controlClasses, FieldWrapper, type FieldOwnProps } from "./field";

interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size">,
    FieldOwnProps {
  /** Icon rendered inside the field, left-aligned. */
  leftIcon?: ReactNode;
  /** Icon or control rendered inside the field, right-aligned. */
  rightIcon?: ReactNode;
}

/**
 * Input — a labelled text input with hint/error states and optional inline
 * icons. Forwards its ref so it drops straight into React Hook Form's
 * `register()`.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    hint,
    error,
    required,
    wrapperClassName,
    leftIcon,
    rightIcon,
    id,
    className,
    ...props
  },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hasError = Boolean(error);

  return (
    <FieldWrapper
      htmlFor={inputId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      wrapperClassName={wrapperClassName}
    >
      <div className="relative">
        {leftIcon && (
          <span
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted"
            aria-hidden="true"
          >
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={hasError || undefined}
          aria-describedby={
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          className={cn(
            controlClasses(hasError, className),
            "h-11",
            leftIcon && "pl-10",
            rightIcon && "pr-10",
          )}
          {...props}
        />
        {rightIcon && (
          <span className="absolute inset-y-0 right-3 flex items-center text-muted">
            {rightIcon}
          </span>
        )}
      </div>
    </FieldWrapper>
  );
});
