"use client";

import { forwardRef, useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";

type PasswordInputProps = Omit<ComponentProps<typeof Input>, "type" | "rightIcon">;

/**
 * PasswordInput — the shared password field with a show/hide toggle. Wraps
 * {@link Input} and forwards its ref so it drops straight into React Hook
 * Form's `register()`. All Input props (label, error, hint, leftIcon…) pass
 * through unchanged.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(props, ref) {
    const [visible, setVisible] = useState(false);

    return (
      <Input
        {...props}
        ref={ref}
        type={visible ? "text" : "password"}
        rightIcon={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            className="pointer-events-auto grid place-items-center rounded-field text-muted transition-colors hover:text-primary"
          >
            {visible ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </button>
        }
      />
    );
  },
);
