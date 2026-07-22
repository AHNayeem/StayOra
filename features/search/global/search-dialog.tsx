"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Clock,
  CornerDownLeft,
  Loader2,
  MapPin,
  Search,
  TrendingUp,
  X,
} from "lucide-react";
import type { Listing } from "@/types/catalog";
import type { VerticalHit } from "@/types/search";
import { getPopularSearches, listingHref } from "@/services/search";
import { VerticalIcon } from "@/components/shared/vertical-icon";
import { PriceTag } from "@/components/ui/price-tag";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { cn } from "@/lib/utils";
import { clearRecentSearches, useRecentSearches } from "./recent-searches";
import { useGlobalSearch } from "./use-global-search";

type Item =
  | { kind: "query"; id: string; term: string }
  | { kind: "listing"; id: string; listing: Listing }
  | { kind: "destination"; id: string; term: string }
  | { kind: "vertical"; id: string; hit: VerticalHit };

/**
 * SearchDialog — the global search command palette. A single input drives live,
 * grouped suggestions (top listings, destinations, category shortcuts); before
 * typing it surfaces recent and popular searches. Full keyboard control, and
 * Enter always runs a full search for the current query.
 *
 * Mounted only while open, so its state resets naturally on each open.
 */
export function SearchDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { query, suggestions, loading, active, setQuery, remember } = useGlobalSearch();
  const recent = useRecentSearches();
  const popular = useMemo(() => getPopularSearches(), []);

  const [activeIndex, setActiveIndex] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useLockBodyScroll(true);
  useFocusTrap(dialogRef, true, onClose);

  // Move focus into the input on open (a DOM side effect, not a state update).
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, []);

  // Flat, ordered list of navigable items — drives arrow-key selection.
  const items = useMemo<Item[]>(() => {
    if (active) {
      const list: Item[] = [{ kind: "query", id: "q", term: query.trim() }];
      suggestions?.listings.forEach((l) =>
        list.push({ kind: "listing", id: `l-${l.id}`, listing: l }),
      );
      suggestions?.destinations.forEach((d) =>
        list.push({ kind: "destination", id: `d-${d}`, term: d }),
      );
      suggestions?.verticals.forEach((v) =>
        list.push({ kind: "vertical", id: `v-${v.key}`, hit: v }),
      );
      return list;
    }
    return [
      ...recent.map((t) => ({ kind: "query" as const, id: `r-${t}`, term: t })),
      ...popular.map((t) => ({ kind: "query" as const, id: `p-${t}`, term: t })),
    ];
  }, [active, query, suggestions, recent, popular]);

  const activate = (item: Item) => {
    onClose();
    if (item.kind === "listing") {
      remember(query.trim());
      router.push(listingHref(item.listing));
    } else if (item.kind === "vertical") {
      router.push(item.hit.href);
    } else {
      const term = item.term.trim();
      if (!term) return;
      remember(term);
      router.push(`/search?q=${encodeURIComponent(term)}`);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (items.length ? (i + 1) % items.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) =>
        items.length ? (i - 1 + items.length) % items.length : 0,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[activeIndex] ?? items[0];
      if (item) activate(item);
    }
  };

  // Index of an item in the flat list, for wiring hover/selected state.
  const indexOf = (id: string) => items.findIndex((it) => it.id === id);

  return (
    <div
      className="animate-fade-in fixed inset-0 z-100 flex items-start justify-center bg-ink/50 p-4 pt-[8vh] backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="animate-scale-in flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-panel border border-line bg-surface shadow-menu outline-none"
      >
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-line px-4">
          {loading ? (
            <Loader2 className="size-5 shrink-0 animate-spin text-primary" aria-hidden="true" />
          ) : (
            <Search className="size-5 shrink-0 text-muted" aria-hidden="true" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="Search stays, tours, transport, destinations…"
            aria-label="Search"
            className="h-15 w-full bg-transparent text-base text-ink placeholder:text-muted focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="grid size-8 shrink-0 place-items-center rounded-field text-muted transition-colors hover:bg-surface-muted hover:text-ink"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {active ? (
            <ActiveResults
              query={query.trim()}
              suggestions={suggestions}
              loading={loading}
              activeIndex={activeIndex}
              indexOf={indexOf}
              onHover={setActiveIndex}
              onActivate={activate}
            />
          ) : (
            <IdleView
              recent={recent}
              popular={popular}
              activeIndex={activeIndex}
              indexOf={indexOf}
              onHover={setActiveIndex}
              onPick={(term) => activate({ kind: "query", id: "x", term })}
            />
          )}
        </div>

        {/* Footer hint */}
        <div className="hidden items-center gap-4 border-t border-line px-4 py-2.5 text-xs text-muted sm:flex">
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-line px-1.5 py-0.5">↑</kbd>
            <kbd className="rounded border border-line px-1.5 py-0.5">↓</kbd>
            to navigate
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-line px-1.5 py-0.5">↵</kbd>
            to select
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-line px-1.5 py-0.5">esc</kbd>
            to close
          </span>
        </div>
      </div>
    </div>
  );
}

// ---- sub-views -------------------------------------------------------------

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pb-1 pt-3 text-overline text-muted first:pt-1">{children}</p>
  );
}

function ActiveResults({
  query,
  suggestions,
  loading,
  activeIndex,
  indexOf,
  onHover,
  onActivate,
}: {
  query: string;
  suggestions: ReturnType<typeof useGlobalSearch>["suggestions"];
  loading: boolean;
  activeIndex: number;
  indexOf: (id: string) => number;
  onHover: (i: number) => void;
  onActivate: (item: Item) => void;
}) {
  const hasResults =
    suggestions &&
    (suggestions.listings.length > 0 ||
      suggestions.destinations.length > 0 ||
      suggestions.verticals.length > 0);

  return (
    <div role="listbox" aria-label="Search results">
      {/* Run-a-search row (always available) */}
      <Row
        selected={activeIndex === 0}
        onHover={() => onHover(0)}
        onClick={() => onActivate({ kind: "query", id: "q", term: query })}
        icon={<Search className="size-4" aria-hidden="true" />}
      >
        <span className="flex-1 truncate">
          Search for <span className="font-semibold text-ink">“{query}”</span>
          {suggestions && suggestions.totalListings > 0 && (
            <span className="text-muted">
              {" "}· {suggestions.totalListings}{" "}
              {suggestions.totalListings === 1 ? "result" : "results"}
            </span>
          )}
        </span>
      </Row>

      {loading && !suggestions && (
        <p className="px-3 py-6 text-center text-sm text-muted">Searching…</p>
      )}

      {suggestions && suggestions.listings.length > 0 && (
        <>
          <GroupLabel>Top matches</GroupLabel>
          {suggestions.listings.map((l) => {
            const i = indexOf(`l-${l.id}`);
            return (
              <Row
                key={l.id}
                selected={i === activeIndex}
                onHover={() => onHover(i)}
                onClick={() => onActivate({ kind: "listing", id: `l-${l.id}`, listing: l })}
                thumb={l.image}
                thumbAlt={l.title}
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium text-ink">{l.title}</span>
                  <span className="inline-flex items-center gap-1 truncate text-xs text-muted">
                    <MapPin className="size-3 shrink-0" aria-hidden="true" />
                    {l.location.label}
                  </span>
                </span>
                <PriceTag price={l.price} size="sm" className="shrink-0" />
              </Row>
            );
          })}
        </>
      )}

      {suggestions && suggestions.destinations.length > 0 && (
        <>
          <GroupLabel>Destinations</GroupLabel>
          {suggestions.destinations.map((d) => {
            const i = indexOf(`d-${d}`);
            return (
              <Row
                key={d}
                selected={i === activeIndex}
                onHover={() => onHover(i)}
                onClick={() => onActivate({ kind: "destination", id: `d-${d}`, term: d })}
                icon={<MapPin className="size-4" aria-hidden="true" />}
              >
                <span className="flex-1 truncate">{d}</span>
              </Row>
            );
          })}
        </>
      )}

      {suggestions && suggestions.verticals.length > 0 && (
        <>
          <GroupLabel>Categories</GroupLabel>
          {suggestions.verticals.map((v) => {
            const i = indexOf(`v-${v.key}`);
            return (
              <Row
                key={v.key}
                selected={i === activeIndex}
                onHover={() => onHover(i)}
                onClick={() => onActivate({ kind: "vertical", id: `v-${v.key}`, hit: v })}
                icon={<VerticalIcon name={v.icon} className="size-4" aria-hidden="true" />}
              >
                <span className="flex-1 truncate">Browse all {v.label}</span>
              </Row>
            );
          })}
        </>
      )}

      {suggestions && !hasResults && !loading && (
        <p className="px-3 py-6 text-center text-sm text-muted">
          No matches — press Enter to search anyway.
        </p>
      )}
    </div>
  );
}

function IdleView({
  recent,
  popular,
  activeIndex,
  indexOf,
  onHover,
  onPick,
}: {
  recent: string[];
  popular: string[];
  activeIndex: number;
  indexOf: (id: string) => number;
  onHover: (i: number) => void;
  onPick: (term: string) => void;
}) {
  return (
    <div role="listbox" aria-label="Suggestions">
      {recent.length > 0 && (
        <>
          <div className="flex items-center justify-between pr-2">
            <GroupLabel>Recent</GroupLabel>
            <button
              type="button"
              onClick={clearRecentSearches}
              className="text-xs font-medium text-muted transition-colors hover:text-primary"
            >
              Clear
            </button>
          </div>
          {recent.map((t) => {
            const i = indexOf(`r-${t}`);
            return (
              <Row
                key={t}
                selected={i === activeIndex}
                onHover={() => onHover(i)}
                onClick={() => onPick(t)}
                icon={<Clock className="size-4" aria-hidden="true" />}
              >
                <span className="flex-1 truncate">{t}</span>
              </Row>
            );
          })}
        </>
      )}

      <GroupLabel>Popular searches</GroupLabel>
      {popular.map((t) => {
        const i = indexOf(`p-${t}`);
        return (
          <Row
            key={t}
            selected={i === activeIndex}
            onHover={() => onHover(i)}
            onClick={() => onPick(t)}
            icon={<TrendingUp className="size-4" aria-hidden="true" />}
          >
            <span className="flex-1 truncate">{t}</span>
          </Row>
        );
      })}
    </div>
  );
}

function Row({
  selected,
  onHover,
  onClick,
  icon,
  thumb,
  thumbAlt,
  children,
}: {
  selected: boolean;
  onHover: () => void;
  onClick: () => void;
  icon?: React.ReactNode;
  thumb?: string;
  thumbAlt?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onMouseMove={onHover}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-field px-3 py-2.5 text-left text-sm transition-colors",
        selected ? "bg-primary-50 text-primary-700" : "text-body hover:bg-surface-muted",
      )}
    >
      {thumb ? (
        <span className="relative size-11 shrink-0 overflow-hidden rounded-field bg-surface-muted">
          <Image src={thumb} alt={thumbAlt ?? ""} fill sizes="44px" className="object-cover" />
        </span>
      ) : icon ? (
        <span className="grid size-8 shrink-0 place-items-center rounded-field bg-surface-muted text-muted">
          {icon}
        </span>
      ) : null}
      {children}
      {selected && (
        <CornerDownLeft className="size-4 shrink-0 text-muted" aria-hidden="true" />
      )}
    </button>
  );
}
