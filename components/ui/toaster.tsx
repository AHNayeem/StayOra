"use client";

import { Toaster as SonnerToaster } from "sonner";

/**
 * Toaster — the single global toast host, mounted once in the root layout so
 * every surface (marketing + dashboard) shares one queue. Styled through
 * Sonner's CSS-variable API so toasts inherit the StayOra design tokens and
 * automatically pick up the dashboard's dark theme (`.dark` re-points the
 * variables). All feedback is emitted through {@link "@/lib/toast"}.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      closeButton
      richColors
      gap={10}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-card !border !border-line !bg-surface !text-ink !shadow-menu !font-sans",
          title: "!font-semibold !text-ink",
          description: "!text-body",
          actionButton: "!rounded-field !bg-primary !text-white",
          cancelButton: "!rounded-field !bg-surface-muted !text-body",
          closeButton: "!border-line !bg-surface !text-muted",
        },
      }}
      style={
        {
          "--normal-bg": "var(--color-surface)",
          "--normal-text": "var(--color-ink)",
          "--normal-border": "var(--color-line)",
        } as React.CSSProperties
      }
    />
  );
}
