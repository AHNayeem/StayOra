"use client";

import { useCallback, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { cn } from "@/lib/utils";

export type DrawerSide = "left" | "right" | "bottom";

const sideMap: Record<DrawerSide, { position: string; anim: string; size: string }> = {
  left: {
    position: "inset-y-0 left-0 h-full",
    anim: "animate-slide-in-left",
    size: "w-[min(22rem,90vw)]",
  },
  right: {
    position: "inset-y-0 right-0 h-full",
    anim: "animate-slide-in-right",
    size: "w-[min(22rem,90vw)]",
  },
  bottom: {
    position: "inset-x-0 bottom-0 w-full",
    anim: "animate-slide-in-bottom",
    size: "max-h-[85dvh] rounded-t-panel",
  },
};

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  /** Edge the drawer slides in from. Default "right". */
  side?: DrawerSide;
  title?: string;
  children: ReactNode;
  /** Sticky footer area (actions). */
  footer?: ReactNode;
  hideClose?: boolean;
  className?: string;
}

/**
 * Drawer — a portalled slide-in panel (left, right, or bottom sheet) with
 * backdrop, focus trap, Escape and scroll lock. Mounts only while `open`. Use
 * for mobile menus, filter panels and quick-view sheets.
 */
export function Drawer({
  open,
  onClose,
  side = "right",
  title,
  children,
  footer,
  hideClose = false,
  className,
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const requestClose = useCallback(() => onClose(), [onClose]);

  useLockBodyScroll(open);
  useFocusTrap(panelRef, open, requestClose);

  if (!open || typeof document === "undefined") return null;

  const s = sideMap[side];

  return createPortal(
    <div className="fixed inset-0 z-70">
      <div
        className="animate-fade-in absolute inset-0 bg-ink/60 backdrop-blur-sm"
        onClick={requestClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={cn(
          "absolute flex flex-col bg-surface shadow-menu focus:outline-none",
          s.position,
          s.anim,
          s.size,
          className,
        )}
      >
        {(title || !hideClose) && (
          <div className="flex items-center justify-between gap-4 border-b border-line p-5">
            {title ? (
              <h2 id={titleId} className="text-h3">
                {title}
              </h2>
            ) : (
              <span />
            )}
            {!hideClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface-muted hover:text-ink"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="border-t border-line p-5">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
