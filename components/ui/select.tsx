"use client";

import { forwardRef, useId, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { controlClasses, FieldWrapper, type FieldOwnProps } from "./field";

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

interface SelectProps
  extends SelectHTMLAttributes<HTMLSelectElement>,
    FieldOwnProps {
  /** Options to render. Alternatively pass `<option>` children. */
  options?: SelectOption[];
  /** Placeholder shown as a disabled first option. */
  placeholder?: string;
}

/**
 * Select — a labelled native `<select>` styled to match the text inputs, with a
 * custom chevron. Native on purpose: accessible and mobile-friendly for free.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    label,
    hint,
    error,
    required,
    wrapperClassName,
    options,
    placeholder,
    id,
    className,
    children,
    defaultValue,
    value,
    ...props
  },
  ref,
) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const hasError = Boolean(error);
  // Only default to the placeholder when the field is uncontrolled and unset.
  const resolvedDefault =
    value === undefined && defaultValue === undefined && placeholder
      ? ""
      : defaultValue;

  return (
    <FieldWrapper
      htmlFor={selectId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      wrapperClassName={wrapperClassName}
    >
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          required={required}
          aria-invalid={hasError || undefined}
          aria-describedby={
            error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined
          }
          value={value}
          defaultValue={resolvedDefault}
          className={cn(
            controlClasses(hasError, className),
            "h-11 cursor-pointer appearance-none pr-10",
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute inset-y-0 right-3 my-auto size-4 text-muted"
          aria-hidden="true"
        />
      </div>
    </FieldWrapper>
  );
});
