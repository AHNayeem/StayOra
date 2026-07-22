"use client";

import {
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { useClickOutside } from "@/hooks/use-click-outside";

interface DropdownMenuProps {
  /**
   * Render the trigger. Receives the open state and props to spread onto a
   * focusable element (button).
   */
  trigger: (args: {
    open: boolean;
    props: {
      "aria-haspopup": "menu";
      "aria-expanded": boolean;
      "aria-controls": string;
      onClick: () => void;
    };
  }) => ReactNode;
  children: ReactNode;
  /** Accessible label for the menu. */
  label: string;
  align?: "start" | "end";
  panelClassName?: string;
}

/**
 * DropdownMenu — a generic action menu (row actions, bulk actions, column
 * toggles). Handles outside-click + Escape dismissal and roving arrow-key focus
 * across its `role="menuitem"` children. Menu items close the menu on click.
 * Presentation-only — callers supply the items via {@link DropdownItem}.
 */
export function DropdownMenu({
  trigger,
  children,
  label,
  align = "end",
  panelClassName,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useClickOutside(containerRef, () => setOpen(false), open);

  const items = () =>
    panelRef.current
      ? Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(
            '[role="menuitem"]:not([disabled])',
          ),
        )
      : [];

  const onPanelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const list = items();
    if (list.length === 0) return;
    const current = list.indexOf(document.activeElement as HTMLElement);
    const dir = e.key === "ArrowDown" ? 1 : -1;
    const next = (current + dir + list.length) % list.length;
    list[next].focus();
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      onClick={() => {
        // Any menuitem activation bubbles here — close after it runs.
        if (open) setOpen(false);
      }}
    >
      {trigger({
        open,
        props: {
          "aria-haspopup": "menu",
          "aria-expanded": open,
          "aria-controls": panelId,
          onClick: () => setOpen((v) => !v),
        },
      })}

      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="menu"
          aria-label={label}
          onKeyDown={onPanelKeyDown}
          className={cn(
            "animate-pop-in absolute top-[calc(100%+0.375rem)] z-50 min-w-48 rounded-card border border-line bg-surface p-1.5 shadow-menu",
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

interface DropdownItemProps {
  children: ReactNode;
  onSelect?: () => void;
  icon?: ReactNode;
  /** Destructive styling (e.g. Delete). */
  danger?: boolean;
  disabled?: boolean;
}

/** DropdownItem — a single action row inside a {@link DropdownMenu}. */
export function DropdownItem({
  children,
  onSelect,
  icon,
  danger = false,
  disabled = false,
}: DropdownItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-field px-3 py-2 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50",
        danger
          ? "text-danger hover:bg-danger/10"
          : "text-body hover:bg-surface-muted hover:text-ink",
      )}
    >
      {icon && <span className="shrink-0 [&_svg]:size-4">{icon}</span>}
      <span className="flex-1 truncate">{children}</span>
    </button>
  );
}

/** DropdownSeparator — a hairline between item groups. */
export function DropdownSeparator() {
  return <div role="separator" className="my-1 h-px bg-line" />;
}

/** DropdownLabel — a small non-interactive group heading. */
export function DropdownLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-3 py-1.5 text-xs font-semibold tracking-wide text-muted uppercase">
      {children}
    </p>
  );
}
