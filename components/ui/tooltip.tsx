"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TooltipSide = "top" | "bottom" | "left" | "right";

const sideMap: Record<TooltipSide, string> = {
  top: "bottom-full left-1/2 mb-2 -translate-x-1/2",
  bottom: "top-full left-1/2 mt-2 -translate-x-1/2",
  left: "right-full top-1/2 mr-2 -translate-y-1/2",
  right: "left-full top-1/2 ml-2 -translate-y-1/2",
};

interface TooltipProps {
  /** Tooltip text. */
  content: ReactNode;
  /** The trigger element(s). */
  children: ReactNode;
  side?: TooltipSide;
  className?: string;
}

/**
 * Tooltip — a lightweight hover/focus label. Appears on pointer-enter and
 * keyboard focus, dismisses on leave/blur/Escape, and is wired to the trigger
 * via aria-describedby. CSS-positioned (no portal) — keep content short.
 */
export function Tooltip({ content, children, side = "top", className }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <span aria-describedby={open ? id : undefined}>{children}</span>
      {open && (
        <span
          role="tooltip"
          id={id}
          className={cn(
            "animate-fade-in pointer-events-none absolute z-70 w-max max-w-xs rounded-field bg-ink px-2.5 py-1.5 text-xs font-medium text-white shadow-menu",
            sideMap[side],
            className,
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
