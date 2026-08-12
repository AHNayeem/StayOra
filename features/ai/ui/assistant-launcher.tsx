"use client";

import { Sparkles } from "lucide-react";
import { useT } from "@/features/i18n";
import { useAssistant } from "./assistant-provider";
import { AssistantPanel } from "./assistant-panel";

/**
 * AssistantLauncher — the persistent floating entry point, plus the panel it
 * opens. Rendered once by the public layout, so the assistant is reachable from
 * every page without each page having to know about it.
 *
 * The button hides while the panel is open (it would sit under the sheet on
 * mobile) and it sits above the footer CTA band but below modals and the search
 * palette, matching the existing z-index ladder.
 */
export function AssistantLauncher() {
  const { open, openAssistant } = useAssistant();
  const t = useT();

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => openAssistant()}
          aria-label={t("Open the Otithee AI travel assistant")}
          className="fixed bottom-5 end-5 z-60 inline-flex items-center gap-2 rounded-pill bg-primary py-3 ps-4 pe-5 text-sm font-semibold text-white shadow-card transition-all hover:bg-primary-600 hover:shadow-card-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:bottom-8 sm:end-8"
        >
          <Sparkles className="size-4.5" aria-hidden="true" />
          <span className="hidden sm:inline">{t("Ask Otithee AI")}</span>
          <span className="sm:hidden">{t("AI")}</span>
        </button>
      )}

      <AssistantPanel />
    </>
  );
}
