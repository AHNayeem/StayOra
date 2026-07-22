"use client";

import { useCallback, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { cn } from "@/lib/utils";

export type ModalSize = "sm" | "md" | "lg" | "xl";

const sizeMap: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Accessible title; rendered in the header and wired to aria-labelledby. */
  title?: string;
  /** Optional supporting line under the title. */
  description?: string;
  children: ReactNode;
  /** Sticky footer area (actions). */
  footer?: ReactNode;
  size?: ModalSize;
  /** Hide the default close (×) button. */
  hideClose?: boolean;
  /** Disable closing on backdrop click / Escape (for destructive confirms). */
  dismissible?: boolean;
  className?: string;
}

/**
 * Modal — a centered, portalled dialog with backdrop, focus trap, Escape and
 * scroll lock. Mounts only while `open`, so it never ships hidden DOM. Compose
 * actions via `footer`. The canonical overlay behind AuthModal, confirms, etc.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  hideClose = false,
  dismissible = true,
  className,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  useLockBodyScroll(open);

  const requestClose = useCallback(() => {
    if (dismissible) onClose();
  }, [dismissible, onClose]);

  useFocusTrap(panelRef, open, requestClose);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
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
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          "animate-scale-in relative flex max-h-[calc(100dvh-2rem)] w-full flex-col rounded-panel bg-surface shadow-menu focus:outline-none",
          sizeMap[size],
          className,
        )}
      >
        {(title || !hideClose) && (
          <div className="flex items-start justify-between gap-4 border-b border-line p-5">
            <div className="min-w-0">
              {title && (
                <h2 id={titleId} className="text-h3">
                  {title}
                </h2>
              )}
              {description && (
                <p id={descId} className="mt-1 text-sm text-body">
                  {description}
                </p>
              )}
            </div>
            {!hideClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="-mr-1 -mt-1 grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface-muted hover:text-ink"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
        <div className="overflow-y-auto p-5">{children}</div>
        {footer && (
          <div className="border-t border-line p-5">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  );
}
