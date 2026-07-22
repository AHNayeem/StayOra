"use client";

import { useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useClickOutside } from "@/hooks/use-click-outside";
import { cn } from "@/lib/utils";

/**
 * FieldShell — the shared visual layout for a single search field: a rounded
 * icon, a small label, and the field's value/control beneath it. Used by every
 * hero-search field so they line up perfectly whether the control is a button,
 * an input, or a popover trigger.
 */
export function FieldShell({
  icon,
  label,
  children,
  className,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-3 px-4 py-2.5", className)}>
      <span
        className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-50 text-primary"
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-xs font-medium text-muted">{label}</span>
        {children}
      </span>
    </span>
  );
}

interface FieldPopoverProps {
  icon: ReactNode;
  label: string;
  /** Summary rendered inside the trigger (the selection, or a placeholder). */
  value: ReactNode;
  /** Dim the value when it's placeholder text. */
  isPlaceholder?: boolean;
  /** Which edge the panel aligns to. Default "left". */
  align?: "left" | "right";
  panelClassName?: string;
  /** Panel content. Receives a `close` callback for self-dismissal. */
  children: (close: () => void) => ReactNode;
  className?: string;
}

/**
 * FieldPopover — a button-triggered popover built on the shared FieldShell.
 * Handles open state, outside-click, Escape, and ARIA. Powers the date and
 * guest fields; the location field manages its own input + dropdown instead.
 */
export function FieldPopover({
  icon,
  label,
  value,
  isPlaceholder = false,
  align = "left",
  panelClassName,
  children,
  className,
}: FieldPopoverProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const close = () => setOpen(false);
  useClickOutside(wrapperRef, close, open);

  return (
    <div
      ref={wrapperRef}
      className={cn("relative", className)}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          close();
        }
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex w-full items-center rounded-field transition-colors hover:bg-surface-muted"
      >
        <FieldShell icon={icon} label={label} className="flex-1">
          <span
            className={cn(
              "flex items-center gap-1 truncate text-sm font-semibold",
              isPlaceholder ? "text-muted" : "text-ink",
            )}
          >
            {value}
          </span>
        </FieldShell>
        <ChevronDown
          className={cn(
            "mr-3 size-4 shrink-0 text-muted transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="dialog"
          className={cn(
            "animate-pop-in absolute top-full z-40 mt-2 rounded-card border border-line bg-surface p-4 shadow-menu",
            align === "right" ? "right-0" : "left-0",
            panelClassName,
          )}
        >
          {children(close)}
        </div>
      )}
    </div>
  );
}
