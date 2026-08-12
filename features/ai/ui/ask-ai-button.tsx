"use client";

import { Sparkles } from "lucide-react";
import type { AIPageContext } from "@/types/ai";
import { cn } from "@/lib/utils";
import { useOptionalAssistant } from "./assistant-provider";

/**
 * AskAiButton — the contextual entry point dropped onto product surfaces.
 *
 * It carries the page's subject ({@link AIPageContext}) into the assistant, so
 * "Ask AI about this hotel" opens a conversation that already knows which hotel
 * and which city. That is the difference between a chatbot bolted onto a site
 * and a concierge standing next to the traveller.
 *
 * Renders nothing outside an {@link "./assistant-provider".AssistantProvider}
 * (the admin dashboard has its own shell), so it is safe to place anywhere.
 */
export function AskAiButton({
  label,
  prompt,
  page,
  /** Send the prompt straight away instead of pre-filling the composer. */
  autoSend = false,
  variant = "outline",
  className,
}: {
  label: string;
  /** The question to ask on the traveller's behalf. */
  prompt: string;
  page?: AIPageContext;
  autoSend?: boolean;
  variant?: "outline" | "solid" | "subtle";
  className?: string;
}) {
  const assistant = useOptionalAssistant();
  if (!assistant) return null;

  const styles = {
    outline:
      "border border-line bg-surface text-ink hover:border-primary hover:text-primary",
    solid: "bg-primary text-white hover:bg-primary-600",
    subtle: "bg-primary-50 text-primary-700 hover:bg-primary-100",
  }[variant];

  return (
    <button
      type="button"
      onClick={() => assistant.openAssistant({ prompt, page, send: autoSend })}
      className={cn(
        "inline-flex items-center gap-2 rounded-pill px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        styles,
        className,
      )}
    >
      <Sparkles className="size-4" aria-hidden="true" />
      {label}
    </button>
  );
}
