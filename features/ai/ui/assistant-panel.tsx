"use client";

import { useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Maximize2, RotateCcw, Sparkles, X } from "lucide-react";
import { useT } from "@/features/i18n";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useIsDesktop } from "@/hooks/use-media-query";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { getAssistantInfo } from "@/services/ai";
import { useAssistant } from "./assistant-provider";
import { ChatView } from "./chat-view";

/**
 * AssistantPanel — the assistant's floating surface.
 *
 * Responsive by layout rather than by two components: a full-height right-hand
 * side panel from `md` up, a near-full-screen sheet below it. The backdrop is
 * only rendered on small screens, because on desktop the traveller should still
 * be able to read the page the assistant is talking about.
 *
 * Mounted only while open, so state resets naturally per session and the focus
 * trap has something to trap. Portalled to `document.body` so it escapes the
 * sticky header's stacking context.
 */
export function AssistantPanel() {
  const { open, closeAssistant, reset, messages, page } = useAssistant();
  const panelRef = useRef<HTMLDivElement>(null);
  const t = useT();

  // Lock scroll on mobile only — the desktop panel sits beside a usable page.
  const isDesktop = useIsDesktop();
  useLockBodyScroll(open && !isDesktop);
  useFocusTrap(panelRef, open, closeAssistant);

  if (!open || typeof document === "undefined") return null;

  const info = getAssistantInfo();

  return createPortal(
    <div className="fixed inset-0 z-80 md:pointer-events-none">
      <div
        className="animate-fade-in absolute inset-0 bg-ink/50 backdrop-blur-sm md:hidden"
        onClick={closeAssistant}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("Otithee AI travel assistant")}
        tabIndex={-1}
        className="animate-slide-in-bottom pointer-events-auto absolute inset-x-0 bottom-0 flex h-[92dvh] flex-col overflow-hidden rounded-t-panel border border-line bg-surface shadow-menu outline-none md:inset-y-0 md:start-auto md:end-0 md:h-full md:w-104 md:animate-slide-in-right md:rounded-none md:border-y-0 md:border-e-0 lg:w-120"
      >
        <header className="flex items-center gap-2 border-b border-line px-4 py-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-50 text-primary">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">Otithee AI</p>
            <p className="truncate text-xs text-muted">
              {page?.label ? `About ${page.label}` : "Travel concierge"}
            </p>
          </div>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={reset}
              aria-label={t("Clear conversation")}
              title={t("Clear conversation")}
              className="grid size-8 place-items-center rounded-field text-muted transition-colors hover:bg-surface-muted hover:text-ink"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
            </button>
          )}
          <Link
            href="/ai"
            onClick={closeAssistant}
            aria-label={t("Open the full assistant page")}
            title={t("Open full page")}
            className="grid size-8 place-items-center rounded-field text-muted transition-colors hover:bg-surface-muted hover:text-ink"
          >
            <Maximize2 className="size-4" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={closeAssistant}
            aria-label={t("Close assistant")}
            className="grid size-8 place-items-center rounded-field text-muted transition-colors hover:bg-surface-muted hover:text-ink"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </header>

        <ChatView compact />

        <p className="sr-only">Answers are produced by the {info.label}.</p>
      </div>
    </div>,
    document.body,
  );
}
