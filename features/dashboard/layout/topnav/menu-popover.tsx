"use client";

import {
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { useClickOutside } from "@/hooks/use-click-outside";

interface MenuPopoverProps {
  /** Render the trigger. Receives props to spread onto a button. */
  trigger: (args: {
    open: boolean;
    toggle: () => void;
    props: {
      "aria-haspopup": "menu";
      "aria-expanded": boolean;
      "aria-controls": string;
      onClick: () => void;
    };
  }) => ReactNode;
  children: ReactNode;
  /** Panel alignment relative to the trigger. */
  align?: "start" | "end";
  /** Accessible label for the popover panel. */
  label: string;
  /** Extra classes for the panel (e.g. width). */
  panelClassName?: string;
}

/**
 * Accessible dropdown primitive for the top nav (notifications, profile, theme,
 * switchers…). Handles open state, outside-click and Escape dismissal, focus
 * ring and entrance animation. Presentation-only — callers supply the content.
 */
export function MenuPopover({
  trigger,
  children,
  align = "end",
  label,
  panelClassName,
}: MenuPopoverProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useClickOutside(containerRef, () => setOpen(false), open);

  const toggle = () => setOpen((v) => !v);

  return (
    <div
      ref={containerRef}
      className="relative"
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      {trigger({
        open,
        toggle,
        props: {
          "aria-haspopup": "menu",
          "aria-expanded": open,
          "aria-controls": panelId,
          onClick: toggle,
        },
      })}

      {open && (
        <div
          id={panelId}
          role="menu"
          aria-label={label}
          className={cn(
            "animate-pop-in absolute top-[calc(100%+0.5rem)] z-50 min-w-56 rounded-card border border-line bg-surface p-1.5 shadow-menu",
            align === "end" ? "right-0" : "left-0",
            panelClassName,
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

interface MenuTriggerButtonProps {
  children: ReactNode;
  label: string;
  /** Optional count badge (e.g. unread notifications). */
  count?: number;
  active?: boolean;
  buttonProps: Record<string, unknown>;
}

/** Shared icon-button styling for top-nav popover triggers. */
export function MenuTriggerButton({
  children,
  label,
  count,
  active,
  buttonProps,
}: MenuTriggerButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "relative grid size-10 place-items-center rounded-field text-body transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        active && "bg-surface-muted text-ink",
      )}
      {...buttonProps}
    >
      {children}
      {typeof count === "number" && count > 0 && (
        <span className="absolute right-1.5 top-1.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[0.625rem] font-bold leading-none text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
