"use client";

import { useEffect, useRef } from "react";
import { RotateCcw, Send, Sparkles, TriangleAlert, User } from "lucide-react";
import type { AIMessage } from "@/types/ai";
import { useT } from "@/features/i18n";
import { cn } from "@/lib/utils";
import { useAssistant } from "./assistant-provider";
import { BlockRenderer, AiText } from "./blocks";
import { SuggestionChips } from "./suggestion-chips";

/** Prompts shown before the traveller has said anything. */
const OPENERS = [
  "Plan my next trip",
  "Find the cheapest flight",
  "Find a family hotel",
  "Build a 7-day itinerary",
  "Compare hotels",
  "Help me plan within my budget",
];

/**
 * ChatView — the conversation itself, shared verbatim by the floating panel and
 * the full-page assistant. Owning the transcript in one component is what keeps
 * "the same assistant" true across surfaces: the panel and the page differ only
 * in their frame.
 */
export function ChatView({
  className,
  /** Extra prompts for the surface the assistant was opened from. */
  contextualPrompts,
  compact = false,
}: {
  className?: string;
  contextualPrompts?: string[];
  compact?: boolean;
}) {
  const { messages, busy, draft, setDraft, send, retry, page } = useAssistant();
  const t = useT();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Keep the newest turn in view by scrolling the transcript itself. Using
  // `scrollIntoView` here would also scroll the *page* on the full-page
  // assistant, yanking the header out of view on every answer.
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: messages.length > 2 ? "smooth" : "auto" });
  }, [messages]);

  const openers = contextualPrompts ?? page?.suggestions ?? OPENERS;

  const submit = () => {
    if (busy) return;
    send(draft);
    inputRef.current?.focus();
  };

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        aria-label={t("Conversation")}
      >
        {messages.length === 0 ? (
          <EmptyState prompts={openers} onPick={send} compact={compact} busy={busy} />
        ) : (
          <ul className="space-y-4">
            {messages.map((message) => (
              <li key={message.id}>
                <MessageBubble
                  message={message}
                  onRetry={() => retry(message.id)}
                  onAsk={send}
                  busy={busy}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-line bg-surface p-3">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          className="flex items-end gap-2 rounded-panel border border-line bg-surface-muted px-3 py-2 focus-within:border-primary"
        >
          <label htmlFor="ai-composer" className="sr-only">
            {t("Ask the travel assistant")}
          </label>
          <textarea
            id="ai-composer"
            ref={inputRef}
            rows={1}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              // Enter sends; Shift+Enter keeps the newline, as in every chat.
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            placeholder={t("Where do you want to go?")}
            className="max-h-32 min-h-[1.75rem] flex-1 resize-none bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || draft.trim().length === 0}
            aria-label={t("Send message")}
            className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-white transition-colors hover:bg-primary-600 disabled:pointer-events-none disabled:opacity-40"
          >
            <Send className="size-4" aria-hidden="true" />
          </button>
        </form>
        <p className="mt-2 text-center text-[0.6875rem] text-muted">
          {t("Prototype assistant — every price comes from Otithee's own inventory.")}
        </p>
      </div>
    </div>
  );
}

function EmptyState({
  prompts,
  onPick,
  compact,
  busy,
}: {
  prompts: string[];
  onPick: (prompt: string) => void;
  compact: boolean;
  busy: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center text-center", compact ? "py-6" : "py-10")}>
      <span className="grid size-12 place-items-center rounded-full bg-primary-50 text-primary">
        <Sparkles className="size-6" aria-hidden="true" />
      </span>
      <h3 className="mt-3 text-h3 text-ink">Where do you want to go?</h3>
      <p className="mt-1 max-w-sm text-sm text-body">
        Tell me your destination, dates, who&apos;s coming and your budget. I&apos;ll search
        Otithee&apos;s real inventory and build the trip with you.
      </p>
      <SuggestionChips
        prompts={prompts}
        onPick={onPick}
        disabled={busy}
        className="mt-4 justify-center"
      />
    </div>
  );
}

function MessageBubble({
  message,
  onRetry,
  onAsk,
  busy,
}: {
  message: AIMessage;
  onRetry: () => void;
  onAsk: (prompt: string) => void;
  busy: boolean;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end gap-2">
        <p className="max-w-[85%] rounded-panel rounded-ee-sm bg-primary px-4 py-2.5 text-sm text-white">
          {message.text}
        </p>
        <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-surface-muted text-muted">
          <User className="size-3.5" aria-hidden="true" />
        </span>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-primary-50 text-primary">
        <Sparkles className="size-3.5" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1 space-y-3">
        {message.status === "pending" ? (
          <TypingIndicator />
        ) : message.status === "error" ? (
          <div className="rounded-panel rounded-es-sm border border-danger/30 bg-danger/5 px-4 py-3">
            <p className="flex items-start gap-2 text-sm text-danger">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {message.text}
            </p>
            <button
              type="button"
              onClick={onRetry}
              disabled={busy}
              className="mt-2 inline-flex items-center gap-1.5 rounded-pill border border-danger/40 px-3 py-1 text-xs font-semibold text-danger transition-colors hover:bg-danger/10"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Try again
            </button>
          </div>
        ) : (
          <>
            {message.text && (
              <p className="rounded-panel rounded-es-sm bg-surface-muted px-4 py-2.5 text-sm text-ink">
                <AiText text={message.text} />
              </p>
            )}

            {message.blocks?.map((block, index) => (
              <BlockRenderer key={`${message.id}-b${index}`} block={block} onAsk={onAsk} />
            ))}

            {message.suggestions && message.suggestions.length > 0 && (
              <SuggestionChips prompts={message.suggestions} onPick={onAsk} disabled={busy} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** The three-dot "thinking" state, hidden from screen readers (the log announces). */
function TypingIndicator() {
  return (
    <p className="inline-flex items-center gap-1.5 rounded-panel rounded-es-sm bg-surface-muted px-4 py-3">
      <span className="sr-only">Searching Otithee…</span>
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          aria-hidden="true"
          className="size-1.5 animate-bounce rounded-full bg-muted"
          style={{ animationDelay: `${index * 140}ms`, animationDuration: "1s" }}
        />
      ))}
    </p>
  );
}
