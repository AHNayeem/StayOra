"use client";

import { useLocale } from "@/features/i18n";
import { formatMoneyTokens } from "../../lib/money";

/**
 * AiText — renders assistant copy with its `{{usd:…}}` money tokens resolved in
 * the visitor's currency. Every string that came out of the engine goes through
 * here, so an answer reads in BDT, EUR or JPY exactly as the rest of the page
 * does — the engine never has to know which.
 */
export function AiText({ text, className }: { text: string; className?: string }) {
  const { money } = useLocale();
  return <span className={className}>{formatMoneyTokens(text, money)}</span>;
}

/** Hook form, for places that need the resolved string rather than an element. */
export function useAiText(): (text: string) => string {
  const { money } = useLocale();
  return (text: string) => formatMoneyTokens(text, money);
}
