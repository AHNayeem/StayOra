"use client";

import { useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { MenuPopover } from "./menu-popover";
import type { SwitcherOption } from "./switcher-data";

interface OptionSwitcherProps {
  label: string;
  options: SwitcherOption[];
  /** Leading icon shown in the trigger. */
  icon?: ReactNode;
  /** Render a compact icon-only trigger (used for language/currency). */
  compact?: boolean;
  align?: "start" | "end";
}

/**
 * Reusable single-select popover for the top nav (organization, merchant,
 * language, currency). Presentation-only; the selected value is local for the
 * Phase 1 shell and will be lifted to app state/persistence in a later phase.
 */
export function OptionSwitcher({
  label,
  options,
  icon,
  compact = false,
  align = "end",
}: OptionSwitcherProps) {
  const [selectedId, setSelectedId] = useState(options[0]?.id);
  const selected = options.find((o) => o.id === selectedId) ?? options[0];

  return (
    <MenuPopover
      label={label}
      align={align}
      panelClassName="min-w-56"
      trigger={({ open, props }) => (
        <button
          type="button"
          aria-label={label}
          title={label}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-field px-3 text-sm font-medium text-body transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            open && "bg-surface-muted text-ink",
            compact && "px-2",
          )}
          {...props}
        >
          {icon}
          {compact ? (
            <span className="font-semibold">{selected?.meta ?? selected?.label}</span>
          ) : (
            <span className="max-w-32 truncate">{selected?.label}</span>
          )}
          <ChevronDown className="size-4 text-muted" aria-hidden="true" />
        </button>
      )}
    >
      <p className="px-3 pb-1 pt-1.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted">
        {label}
      </p>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="menuitemradio"
          aria-checked={option.id === selectedId}
          onClick={() => setSelectedId(option.id)}
          className="flex w-full items-center gap-3 rounded-field px-3 py-2 text-sm text-body transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate font-medium text-ink">{option.label}</span>
            {option.meta && (
              <span className="block truncate text-xs text-muted">{option.meta}</span>
            )}
          </span>
          {option.id === selectedId && (
            <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
          )}
        </button>
      ))}
    </MenuPopover>
  );
}
