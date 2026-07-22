"use client";

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

interface OtpFieldProps {
  /** Current value (digits only, up to `length`). */
  value: string;
  onChange: (value: string) => void;
  length?: number;
  /** Fired when the last box is filled — handy for auto-submit. */
  onComplete?: (value: string) => void;
  error?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * OtpField — a segmented one-time-code input. Fully controlled: the parent owns
 * the string value; this handles per-box typing, backspace, arrow navigation
 * and paste (a pasted "123456" fans out across the boxes). Digits only.
 */
export function OtpField({
  value,
  onChange,
  length = 6,
  onComplete,
  error,
  disabled,
  autoFocus,
}: OtpFieldProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const commit = (next: string) => {
    const clean = next.replace(/\D/g, "").slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
  };

  const focusBox = (index: number) => {
    const clamped = Math.max(0, Math.min(index, length - 1));
    refs.current[clamped]?.focus();
    refs.current[clamped]?.select();
  };

  const handleInput = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const chars = value.split("");
    chars[index] = digit;
    const next = chars.join("").slice(0, length);
    commit(next);
    if (digit) focusBox(index + 1);
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (value[index]) {
        const chars = value.split("");
        chars[index] = "";
        commit(chars.join(""));
      } else {
        focusBox(index - 1);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusBox(index - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusBox(index + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    commit(pasted);
    focusBox(pasted.length);
  };

  return (
    <div className="flex justify-between gap-2" role="group" aria-label="One-time code">
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          value={value[i] ?? ""}
          onChange={(e) => handleInput(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          aria-label={`Digit ${i + 1}`}
          className={cn(
            "h-13 w-full min-w-0 rounded-field border bg-surface text-center text-lg font-semibold text-ink transition-colors focus:outline-none focus:ring-3 focus:ring-primary/25 disabled:opacity-60",
            error
              ? "border-danger focus:border-danger focus:ring-danger/20"
              : "border-line focus:border-primary",
          )}
        />
      ))}
    </div>
  );
}
