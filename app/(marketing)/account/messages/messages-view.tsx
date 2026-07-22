"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, MessagesSquare, SendHorizonal } from "lucide-react";
import type { MessageThread, ThreadMessage } from "@/types/traveler";
import { useAuth } from "@/features/auth";
import { useLocale } from "@/features/i18n";
import { AccountPageHeader } from "@/components/account/account-page-header";
import { AccountEmpty } from "@/components/account/account-empty";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function MessagesView({ threads: initial }: { threads: MessageThread[] }) {
  const { user } = useAuth();
  const [threads, setThreads] = useState(initial);
  const [activeId, setActiveId] = useState<string | null>(null);

  const active = useMemo(
    () => threads.find((t) => t.id === activeId) ?? null,
    [threads, activeId],
  );

  const open = (id: string) => {
    setActiveId(id);
    setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, unread: 0 } : t)));
  };

  const send = (body: string) => {
    if (!active) return;
    const message: ThreadMessage = {
      id: `${active.id}-${Date.now().toString(36)}`,
      from: "me",
      authorName: user?.name ?? "You",
      body,
      sentAt: new Date().toISOString(),
    };
    setThreads((prev) =>
      prev.map((t) =>
        t.id === active.id
          ? { ...t, messages: [...t.messages, message], lastMessageAt: message.sentAt }
          : t,
      ),
    );
  };

  if (threads.length === 0) {
    return (
      <div>
        <AccountPageHeader title="Messages" description="Chat with your hosts and our support team." />
        <AccountEmpty
          icon={MessagesSquare}
          title="No messages"
          description="When you book a stay you can message your host right here."
        />
      </div>
    );
  }

  return (
    <div>
      <AccountPageHeader title="Messages" description="Chat with your hosts and our support team." />

      <div className="grid overflow-hidden rounded-card border border-line bg-surface shadow-card lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* Thread list */}
        <ul
          className={cn(
            "divide-y divide-line border-line lg:block lg:border-r",
            active ? "hidden lg:block" : "block",
          )}
        >
          {threads.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => open(t.id)}
                className={cn(
                  "flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-surface-muted/50",
                  active?.id === t.id && "bg-primary-50/60",
                )}
              >
                <Avatar src={t.counterpart.avatar} name={t.counterpart.name} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-ink">{t.counterpart.name}</span>
                    {t.unread > 0 && (
                      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-white">
                        {t.unread}
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted">{t.subject}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>

        {/* Conversation */}
        <div className={cn("flex min-h-[26rem] flex-col", active ? "flex" : "hidden lg:flex")}>
          {active ? (
            <Conversation thread={active} onBack={() => setActiveId(null)} onSend={send} />
          ) : (
            <div className="grid flex-1 place-items-center p-8 text-center text-muted">
              <div>
                <MessagesSquare className="mx-auto size-8" aria-hidden="true" />
                <p className="mt-2 text-sm">Select a conversation to read it.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Conversation({
  thread,
  onBack,
  onSend,
}: {
  thread: MessageThread;
  onBack: () => void;
  onSend: (body: string) => void;
}) {
  const { dateTime } = useLocale();
  const [draft, setDraft] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    onSend(body);
    setDraft("");
  };

  return (
    <>
      <div className="flex items-center gap-3 border-b border-line p-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to conversations"
          className="grid size-9 place-items-center rounded-field text-muted hover:bg-surface-muted lg:hidden"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <Avatar src={thread.counterpart.avatar} name={thread.counterpart.name} size="sm" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{thread.counterpart.name}</p>
          <p className="truncate text-xs text-muted">
            {thread.counterpart.role}
            {thread.bookingRef ? ` · Ref ${thread.bookingRef}` : ""}
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-surface-muted/30 p-4">
        {thread.messages.map((m) => {
          const mine = m.from === "me";
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-card px-3.5 py-2 text-sm shadow-card",
                  mine ? "bg-primary text-white" : "bg-surface text-ink",
                )}
              >
                <p>{m.body}</p>
                <p className={cn("mt-1 text-[0.65rem]", mine ? "text-white/70" : "text-muted")}>
                  {dateTime(m.sentAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={submit} className="flex items-center gap-2 border-t border-line p-3">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a message…"
          aria-label="Message"
          className="h-11 flex-1 rounded-pill border border-line bg-surface px-4 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/25"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label="Send message"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
        >
          <SendHorizonal className="size-5" aria-hidden="true" />
        </button>
      </form>
    </>
  );
}
