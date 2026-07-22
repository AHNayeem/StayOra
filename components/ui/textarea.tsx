"use client";

import { forwardRef, useId, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { controlClasses, FieldWrapper, type FieldOwnProps } from "./field";

interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement>,
    FieldOwnProps {}

/**
 * Textarea — a labelled multi-line input sharing Input's border/focus/error
 * treatment. Forwards its ref for React Hook Form.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    { label, hint, error, required, wrapperClassName, id, className, rows = 4, ...props },
    ref,
  ) {
    const autoId = useId();
    const textareaId = id ?? autoId;
    const hasError = Boolean(error);

    return (
      <FieldWrapper
        htmlFor={textareaId}
        label={label}
        hint={hint}
        error={error}
        required={required}
        wrapperClassName={wrapperClassName}
      >
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          required={required}
          aria-invalid={hasError || undefined}
          aria-describedby={
            error
              ? `${textareaId}-error`
              : hint
                ? `${textareaId}-hint`
                : undefined
          }
          className={cn(controlClasses(hasError, className), "resize-y py-2.5")}
          {...props}
        />
      </FieldWrapper>
    );
  },
);
