"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bookmark, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { ChatView, removeSavedTrip, useAssistant, useSavedTrips } from "@/features/ai";
import { useLocale } from "@/features/i18n";
import { Container } from "@/components/ui/container";
import { toast } from "@/lib/toast";

/** Capability blurbs shown beside the chat on desktop. */
const CAPABILITIES = [
  { title: "Natural-language search", body: "“Beach resorts in Cox's Bazar under $150 a night”." },
  { title: "Flights, properly", body: "Cabin, stops, baggage, refundability — from live fares." },
  { title: "Real comparisons", body: "Two to four options side by side, with the verdict shown." },
  { title: "Costed plans", body: "A day-by-day itinerary priced against your budget." },
  { title: "Your trips", body: "Bookings, references and what's coming up next." },
];

/**
 * AiWorkspace — the full-page assistant.
 *
 * Shares {@link ChatView} (and therefore all state) with the floating panel, so
 * a conversation started in the panel continues here uninterrupted. It adds two
 * things the panel has no room for: saved trips, and a `?ask=` entry point that
 * makes shared itinerary links actually rebuild the trip.
 */
export function AiWorkspace() {
  const { send, messages, reset, openAssistant } = useAssistant();
  const { money } = useLocale();
  const savedTrips = useSavedTrips();
  const params = useSearchParams();
  const seeded = useRef(false);

  const ask = params.get("ask");

  // Replay a shared prompt exactly once. Guarded by a ref rather than state so
  // a re-render (or React Strict Mode's double effect) can't send it twice.
  useEffect(() => {
    if (!ask || seeded.current || messages.length > 0) return;
    seeded.current = true;
    send(ask);
  }, [ask, messages.length, send]);

  return (
    <Container className="py-8 lg:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-2 text-overline">
            <Sparkles className="size-3.5" aria-hidden="true" />
            Otithee AI
          </span>
          <h1 className="mt-1 text-h1 text-ink">Your travel concierge</h1>
          <p className="mt-2 max-w-2xl text-body">
            Ask in plain language. Every flight, stay, activity and price below comes from
            Otithee&apos;s own inventory — the assistant searches, it never invents.
          </p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-pill border border-line px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            New conversation
          </button>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="flex h-[70dvh] min-h-[32rem] flex-col overflow-hidden rounded-panel border border-line bg-surface shadow-card">
          <ChatView />
        </div>

        <aside className="flex flex-col gap-4">
          {savedTrips.length > 0 && (
            <section className="rounded-card border border-line bg-surface">
              <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-ink">
                Saved trips
              </h2>
              <ul className="divide-y divide-line">
                {savedTrips.map((trip) => (
                  <li key={trip.id} className="flex items-start gap-2 p-3">
                    <Bookmark className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    <button
                      type="button"
                      onClick={() => openAssistant({ prompt: trip.prompt, send: true })}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block truncate text-sm font-medium text-ink">
                        {trip.title}
                      </span>
                      <span className="block text-xs text-muted">
                        {money(trip.totalUsd)}
                        {trip.startDate ? ` · from ${trip.startDate}` : ""}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        removeSavedTrip(trip.id);
                        toast.info("Trip removed");
                      }}
                      aria-label={`Remove ${trip.title}`}
                      className="grid size-7 shrink-0 place-items-center rounded-field text-muted transition-colors hover:bg-surface-muted hover:text-danger"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-card border border-line bg-surface-muted p-4">
            <h2 className="text-sm font-semibold text-ink">What it can do</h2>
            <dl className="mt-3 space-y-3">
              {CAPABILITIES.map((item) => (
                <div key={item.title}>
                  <dt className="text-xs font-semibold text-ink">{item.title}</dt>
                  <dd className="text-xs text-body">{item.body}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 border-t border-line pt-3 text-xs text-muted">
              This is a prototype concierge. It reads Otithee&apos;s demo inventory, and its visa
              and entry-requirement answers are illustrative — always confirm with the official
              source before you travel. See{" "}
              <Link href="/all-visa" className="font-medium text-primary hover:underline">
                visa services
              </Link>
              .
            </p>
          </section>
        </aside>
      </div>
    </Container>
  );
}
