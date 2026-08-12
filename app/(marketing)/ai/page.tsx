import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import { AiWorkspace } from "./ai-workspace";

export const metadata: Metadata = {
  title: "AI Travel Assistant",
  description:
    "Plan trips in plain language. Otithee's AI concierge searches real flights, stays and experiences, compares your options and costs the whole trip against your budget.",
  alternates: { canonical: "/ai" },
};

/**
 * The dedicated assistant page.
 *
 * A thin server shell around the client workspace — the conversation itself is
 * entirely client-side (it reads the session's assistant state), and the page
 * exists so the assistant is linkable, shareable and indexable.
 *
 * The workspace reads `?ask=` via `useSearchParams`, so it is wrapped in
 * `Suspense` as the App Router requires for client search-param access.
 */
export default function AiPage() {
  return (
    <main className="flex-1 bg-surface-muted">
      <Suspense
        fallback={
          <div className="grid min-h-[60vh] place-items-center">
            <Spinner label="Loading the assistant" />
          </div>
        }
      >
        <AiWorkspace />
      </Suspense>
    </main>
  );
}
