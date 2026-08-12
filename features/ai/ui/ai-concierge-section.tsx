"use client";

import { useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Container } from "@/components/ui/container";
import { useT } from "@/features/i18n";
import { useOptionalAssistant } from "./assistant-provider";

/** Homepage prompt starters — one per capability, so the band teaches by example. */
const PROMPTS = [
  "Plan my next trip",
  "Find the cheapest flight",
  "Find a family hotel",
  "Build a 7-day itinerary",
  "Compare hotels",
  "Help me plan within my budget",
];

/**
 * AiConciergeSection — the homepage entry point.
 *
 * A single question ("Where do you want to go?") over a real composer: typing
 * here and pressing enter opens the assistant with the message already sent, so
 * the first interaction costs one action rather than three. The chips below are
 * the same prompts the empty chat offers, which keeps the promise on the home
 * page and the behaviour in the panel identical.
 */
export function AiConciergeSection() {
  const assistant = useOptionalAssistant();
  const [value, setValue] = useState("");
  const t = useT();

  if (!assistant) return null;

  const ask = (prompt: string) => {
    const text = prompt.trim();
    if (!text) return;
    assistant.openAssistant({ prompt: text, send: true, page: { label: "Home" } });
    setValue("");
  };

  return (
    <section className="bg-dark py-16 text-white md:py-20">
      <Container className="max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-pill bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white/90">
          <Sparkles className="size-3.5" aria-hidden="true" />
          {t("Otithee AI")}
        </span>

        <h2 className="mt-4 text-h1 text-white">{t("Where do you want to go?")}</h2>
        <p className="mx-auto mt-3 max-w-xl text-white/70">
          {t(
            "Describe your trip in your own words. Our travel concierge searches real flights, stays and experiences, costs it against your budget, and builds the itinerary with you.",
          )}
        </p>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            ask(value);
          }}
          className="mx-auto mt-7 flex max-w-2xl items-center gap-2 rounded-pill bg-white p-2 shadow-card"
        >
          <label htmlFor="ai-home-composer" className="sr-only">
            {t("Describe your trip")}
          </label>
          <input
            id="ai-home-composer"
            type="text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={t("e.g. 5 days in Dubai with my wife, budget $1,500")}
            className="h-11 min-w-0 flex-1 bg-transparent px-4 text-sm text-ink placeholder:text-muted focus:outline-none"
          />
          <button
            type="submit"
            disabled={value.trim().length === 0}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-pill bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:pointer-events-none disabled:opacity-50"
          >
            {t("Ask AI")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </form>

        <ul className="mt-5 flex flex-wrap justify-center gap-2">
          {PROMPTS.map((prompt) => (
            <li key={prompt}>
              <button
                type="button"
                onClick={() => ask(prompt)}
                className="rounded-pill border border-white/20 px-4 py-1.5 text-xs font-medium text-white/85 transition-colors hover:border-white/50 hover:bg-white/10 hover:text-white"
              >
                {t(prompt)}
              </button>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
