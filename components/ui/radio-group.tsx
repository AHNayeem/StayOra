"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export interface RadioOption {
  label: string;
  value: string;
  hint?: string;
  disabled?: boolean;
}

interface RadioGroupProps {
  /** Radio name — shared across the group's inputs. Auto-generated if omitted. */
  name?: string;
  /** Group label rendered as a legend. */
  label?: string;
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  /** Stack vertically (default) or lay out in a row. */
  orientation?: "vertical" | "horizontal";
  className?: string;
}

/**
 * RadioGroup — a controlled, config-driven set of radio options rendered as a
 * fieldset. Each option shows an optional hint; the whole group is keyboard and
 * screen-reader accessible via native radios.
 */
export function RadioGroup({
  name,
  label,
  options,
  value,
  onChange,
  orientation = "vertical",
  className,
}: RadioGroupProps) {
  const autoName = useId();
  const groupName = name ?? autoName;

  return (
    <fieldset className={cn("flex flex-col gap-2", className)}>
      {label && (
        <legend className="mb-1 text-sm font-medium text-ink">{label}</legend>
      )}
      <div
        className={cn(
          "flex gap-2",
          orientation === "vertical" ? "flex-col" : "flex-row flex-wrap",
        )}
      >
        {options.map((opt) => {
          const checked = opt.value === value;
          return (
            <label
              key={opt.value}
              className={cn(
                "flex cursor-pointer items-start gap-2.5 rounded-field border p-3 transition-colors",
                checked
                  ? "border-primary bg-primary-50"
                  : "border-line hover:border-primary/50",
                opt.disabled && "cursor-not-allowed opacity-50",
              )}
            >
              <input
                type="radio"
                name={groupName}
                value={opt.value}
                checked={checked}
                disabled={opt.disabled}
                onChange={() => onChange(opt.value)}
                className="mt-0.5 size-4 shrink-0 cursor-pointer appearance-none rounded-full border border-line bg-surface transition-shadow checked:border-[5px] checked:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              />
              <span className="flex flex-col">
                <span className="text-sm leading-5 text-ink">{opt.label}</span>
                {opt.hint && (
                  <span className="text-xs text-muted">{opt.hint}</span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
