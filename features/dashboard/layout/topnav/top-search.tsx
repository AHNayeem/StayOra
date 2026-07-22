"use client";

import { Search } from "lucide-react";
import { useShell } from "../shell-context";

/**
 * Global search trigger. Opens the command palette (⌘K) rather than housing its
 * own input, so there is a single search surface. Collapses to an icon button
 * on smaller screens.
 */
export function TopSearch() {
  const { setCommandOpen } = useShell();

  return (
    <>
      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        className="hidden h-10 w-64 items-center gap-2 rounded-field border border-line bg-surface-muted px-3 text-sm text-muted transition-colors hover:border-primary hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:inline-flex"
      >
        <Search className="size-4" aria-hidden="true" />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="rounded border border-line bg-surface px-1.5 py-0.5 text-[0.6875rem] font-medium text-muted">
          ⌘K
        </kbd>
      </button>
      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        aria-label="Search"
        className="grid size-10 place-items-center rounded-field text-body transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:hidden"
      >
        <Search className="size-5" aria-hidden="true" />
      </button>
    </>
  );
}
