"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AIAuthContext,
  AIBookingState,
  AIMessage,
  AIPageContext,
  AIProgressStep,
  AITripContext,
  AIUserAction,
  AgentEvent,
} from "@/types/ai";
import { useAuth } from "@/features/auth";
import { useLocale } from "@/features/i18n";
import { toISODate } from "@/lib/date";
import { toast } from "@/lib/toast";
import { AIError, askAssistant } from "@/services/ai";
import { applyEvent } from "./tool-labels";

/**
 * AssistantProvider — the assistant's session state, mounted once by the public
 * layout so the conversation survives navigation between pages.
 *
 * Two things are deliberately kept apart:
 *
 *  - `messages` — what's on screen, including rendered result blocks.
 *  - `context`  — the small structured memory (destination, dates, budget,
 *    selections) that the engine actually reasons over.
 *
 * Only the second is sent back with each turn, which is what makes "find me a
 * hotel" after "I want to visit Dubai" work without replaying the transcript.
 * Nothing is persisted: the memory is session-scoped by design.
 */

export interface OpenAssistantOptions {
  /** Text to place in the composer. */
  prompt?: string;
  /** Send it immediately instead of waiting for the traveller to press enter. */
  send?: boolean;
  /** The subject of the page the assistant was opened from. */
  page?: AIPageContext;
}

interface AssistantContextValue {
  open: boolean;
  messages: AIMessage[];
  /** True while a turn is in flight. */
  busy: boolean;
  context: AITripContext;
  page?: AIPageContext;
  /** Composer text, lifted so entry points can pre-fill it. */
  draft: string;
  setDraft: (value: string) => void;
  openAssistant: (options?: OpenAssistantOptions) => void;
  closeAssistant: () => void;
  send: (text: string) => void;
  /**
   * Send a structured action raised by a rich block — a confirmed booking, a
   * chosen card, a submitted traveller form.
   *
   * `label` is what appears in the transcript, so the conversation still reads
   * as a conversation; the *action* is what the agent acts on, so nothing is
   * lost to a round trip through English.
   */
  submit: (action: AIUserAction, label: string) => void;
  /** Re-run the question that produced a failed answer. */
  retry: (messageId: string) => void;
  /** Clear the conversation and its memory. */
  reset: () => void;
  /** The booking workflow's current state, when one is in progress. */
  bookingState?: AIBookingState;
}

const AssistantContext = createContext<AssistantContextValue | null>(null);

export function AssistantProvider({ children }: { children: ReactNode }) {
  const { country } = useLocale();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [context, setContext] = useState<AITripContext>({});
  const [page, setPage] = useState<AIPageContext | undefined>(undefined);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  // Identity is passed *into* the engine rather than read inside it, so the
  // same request is reproducible in a test and the engine stays free of any
  // session dependency — which is also what a server-side provider would need.
  const auth = useMemo<AIAuthContext>(
    () => ({
      authenticated: Boolean(user),
      userId: user?.id,
      name: user?.name,
      email: user?.email,
      phone: user?.phone,
    }),
    [user],
  );

  // Monotonic ids — stable across re-renders and free of any random source, so
  // React keys never collide and SSR is never involved.
  const counter = useRef(0);
  const nextId = () => `m${(counter.current += 1)}`;

  // The newest turn wins if a traveller sends again while one is in flight.
  const turn = useRef(0);

  // The memory and page subject are passed *in* rather than read from a ref, so
  // nothing is read during render and every turn provably sees the state that
  // was current when the traveller pressed send.
  const run = useCallback(
    async (
      text: string,
      assistantId: string,
      currentContext: AITripContext,
      currentPage: AIPageContext | undefined,
      action?: AIUserAction,
    ) => {
      const id = ++turn.current;
      setBusy(true);

      // Live progress. The agent emits an event per tool call, so the traveller
      // sees "Checking availability ✓ / Checking the latest price…" instead of
      // a spinner — and the same handler is what a streaming provider will use.
      let steps: AIProgressStep[] = [];
      const onEvent = (event: AgentEvent) => {
        const next = applyEvent(steps, event);
        if (next === steps || id !== turn.current) return;
        steps = next;
        setMessages((prev) =>
          prev.map((message) => (message.id === assistantId ? { ...message, steps: next } : message)),
        );
      };

      try {
        const response = await askAssistant(
          {
            message: text,
            action,
            context: currentContext,
            page: currentPage,
            auth,
            // Read here (in an event-driven path, never during render) so the
            // engine stays clock-free and SSR is never involved.
            today: toISODate(new Date()),
            nowMs: Date.now(),
            countryCode: country?.code,
          },
          { onEvent },
        );
        if (id !== turn.current) return;

        setContext(response.contextPatch);
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  text: response.text,
                  blocks: response.blocks,
                  suggestions: response.suggestions,
                  steps: response.steps ?? (steps.length > 1 ? steps : undefined),
                  status: "done" as const,
                }
              : message,
          ),
        );
      } catch (error) {
        if (id !== turn.current) return;
        const message =
          error instanceof AIError
            ? error.message
            : "Something went wrong reaching the assistant.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, text: message, steps: undefined, status: "error" as const }
              : m,
          ),
        );
      } finally {
        if (id === turn.current) setBusy(false);
      }
    },
    [auth, country],
  );

  /**
   * Send a turn, optionally against a page subject supplied by the caller.
   *
   * The override matters: an entry point that opens the assistant *and* sends a
   * question in the same click can't wait for `setPage` to land, so it hands
   * its context straight to the turn instead of racing React state.
   */
  const sendWith = useCallback(
    (raw: string, pageOverride?: AIPageContext, action?: AIUserAction) => {
      const text = raw.trim();
      if (!text && !action) return;
      // One turn at a time. Without this a second send would supersede the first
      // (the turn guard drops its response) and leave that message stuck on the
      // typing indicator forever. The composer and chips disable while busy, so
      // this is a backstop rather than the primary defence.
      if (busy) return;
      const assistantId = nextId();
      setDraft("");
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "user", text, status: "done" },
        { id: assistantId, role: "assistant", text: "", status: "pending", sourceText: text },
      ]);
      void run(text, assistantId, context, pageOverride ?? page, action);
    },
    [busy, run, context, page],
  );

  const send = useCallback((raw: string) => sendWith(raw), [sendWith]);

  const submit = useCallback(
    (action: AIUserAction, label: string) => sendWith(label, undefined, action),
    [sendWith],
  );

  const retry = useCallback(
    (messageId: string) => {
      const target = messages.find((m) => m.id === messageId);
      if (!target?.sourceText) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, status: "pending", text: "", steps: undefined } : m,
        ),
      );
      void run(target.sourceText, messageId, context, page);
    },
    [messages, run, context, page],
  );

  const openAssistant = useCallback(
    (options?: OpenAssistantOptions) => {
      if (options?.page) setPage(options.page);
      setOpen(true);
      if (options?.prompt) {
        if (options.send) sendWith(options.prompt, options.page);
        else setDraft(options.prompt);
      }
    },
    [sendWith],
  );

  const closeAssistant = useCallback(() => setOpen(false), []);

  const reset = useCallback(() => {
    turn.current += 1; // drop any in-flight answer
    setMessages([]);
    setContext({});
    setDraft("");
    setBusy(false);
    toast.success("Conversation cleared");
  }, []);

  const value = useMemo<AssistantContextValue>(
    () => ({
      open,
      messages,
      busy,
      context,
      page,
      draft,
      setDraft,
      openAssistant,
      closeAssistant,
      send,
      submit,
      retry,
      reset,
      bookingState: context.booking?.state,
    }),
    [
      open,
      messages,
      busy,
      context,
      page,
      draft,
      openAssistant,
      closeAssistant,
      send,
      submit,
      retry,
      reset,
    ],
  );

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

/** Access the assistant. Throws outside {@link AssistantProvider}. */
export function useAssistant(): AssistantContextValue {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error("useAssistant must be used within an <AssistantProvider>.");
  return ctx;
}

/**
 * Safe variant for chrome that also renders where the provider isn't mounted
 * (the admin dashboard has its own shell). Returns `null` instead of throwing,
 * so an entry-point button can simply not render.
 */
export function useOptionalAssistant(): AssistantContextValue | null {
  return useContext(AssistantContext);
}
