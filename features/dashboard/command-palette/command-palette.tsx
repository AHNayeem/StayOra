"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { DashboardIcon } from "../navigation/dashboard-icons";
import { useDashboardMenu } from "../navigation/use-dashboard-menu";
import { useShell } from "../layout/shell-context";

/**
 * Command palette (⌘K) skeleton. Phase 1 provides fuzzy navigation across every
 * menu link the current user can reach, full keyboard control and the dialog
 * shell. Actions, recent/saved searches and global content search plug into the
 * same surface in Phase 5.
 *
 * Mounted only while open (see the shell frame), so open/close naturally resets
 * its state — no reset effects needed.
 */
export function CommandPalette() {
  const { setCommandOpen } = useShell();
  const { links } = useDashboardMenu();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useLockBodyScroll(true);
  useFocusTrap(dialogRef, true, () => setCommandOpen(false));

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? links.filter((l) => l.label.toLowerCase().includes(q))
      : links;
    return list.slice(0, 12);
  }, [links, query]);

  // Focus the input on mount (after the trap moves focus to the dialog).
  // A focus call is a DOM side effect, not a state update.
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, []);

  const go = (href?: string) => {
    if (!href) return;
    setCommandOpen(false);
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) =>
        results.length ? (i - 1 + results.length) % results.length : 0,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[activeIndex]?.href);
    }
  };

  return (
    <div
      className="animate-fade-in fixed inset-0 z-100 flex items-start justify-center bg-ink/40 p-4 pt-[10vh] backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setCommandOpen(false);
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="animate-scale-in w-full max-w-xl overflow-hidden rounded-card border border-line bg-surface shadow-menu outline-none"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="size-5 shrink-0 text-muted" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="Search pages…"
            aria-label="Search pages"
            aria-controls="command-results"
            className="h-14 w-full bg-transparent text-base text-ink placeholder:text-muted focus:outline-none"
          />
          <kbd className="hidden rounded border border-line px-1.5 py-0.5 text-[0.6875rem] font-medium text-muted sm:block">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <ul id="command-results" role="listbox" className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 ? (
            <li className="px-3 py-8 text-center text-sm text-muted">
              No matches for “{query}”.
            </li>
          ) : (
            results.map((item, i) => (
              <li key={item.id} role="option" aria-selected={i === activeIndex}>
                <button
                  type="button"
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => go(item.href)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-field px-3 py-2.5 text-left text-sm transition-colors",
                    i === activeIndex
                      ? "bg-primary-50 text-primary-700"
                      : "text-body hover:bg-surface-muted",
                  )}
                >
                  {item.icon ? (
                    <DashboardIcon name={item.icon} className="size-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <span className="size-4 shrink-0" aria-hidden="true" />
                  )}
                  <span className="flex-1 truncate">{item.label}</span>
                  {i === activeIndex && (
                    <CornerDownLeft className="size-4 text-muted" aria-hidden="true" />
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
