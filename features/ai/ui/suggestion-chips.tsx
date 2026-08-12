"use client";

import { cn } from "@/lib/utils";

/**
 * SuggestionChips — tappable follow-ups. The assistant returns these with every
 * answer, which is what keeps a conversation moving on a phone where typing a
 * full sentence is the main source of friction.
 */
export function SuggestionChips({
  prompts,
  onPick,
  disabled = false,
  className,
}: {
  prompts: string[];
  onPick: (prompt: string) => void;
  /** Disabled while a turn is in flight — the assistant answers one at a time. */
  disabled?: boolean;
  className?: string;
}) {
  if (prompts.length === 0) return null;
  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {prompts.map((prompt) => (
        <li key={prompt}>
          <button
            type="button"
            onClick={() => onPick(prompt)}
            disabled={disabled}
            className="rounded-pill border border-line bg-surface px-3 py-1.5 text-xs font-medium text-body transition-colors hover:border-primary hover:bg-primary-50 hover:text-primary-700 disabled:pointer-events-none disabled:opacity-50"
          >
            {prompt}
          </button>
        </li>
      ))}
    </ul>
  );
}
