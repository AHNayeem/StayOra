"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchDialog } from "./search-dialog";

/**
 * SearchTrigger — the header's entry point to global search. Renders a roomy
 * pill on wide screens and an icon button on narrow ones (both open the same
 * dialog), and binds ⌘K / Ctrl-K / "/" as global shortcuts. Owns the open
 * state and mounts {@link SearchDialog} only while open.
 */
export function SearchTrigger({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const cmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      const slash =
        e.key === "/" &&
        !/^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement)?.tagName ?? "") &&
        !(e.target as HTMLElement)?.isContentEditable;
      if (cmdK || slash) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      {/* Wide: labelled pill */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "hidden items-center gap-2 rounded-pill border border-line bg-surface-muted/60 py-2 pl-3 pr-2.5 text-sm text-muted transition-colors hover:border-primary/40 hover:text-ink xl:inline-flex",
          className,
        )}
      >
        <Search className="size-4" aria-hidden="true" />
        <span className="pr-6">Search…</span>
        <kbd className="rounded border border-line bg-surface px-1.5 py-0.5 text-[0.6875rem] font-medium">
          ⌘K
        </kbd>
      </button>

      {/* Narrow: icon button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search"
        className={cn(
          "grid size-10 place-items-center rounded-field text-ink transition-colors hover:bg-primary-50 hover:text-primary xl:hidden",
          className,
        )}
      >
        <Search className="size-5" aria-hidden="true" />
      </button>

      {open && <SearchDialog onClose={() => setOpen(false)} />}
    </>
  );
}
