"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, SearchX } from "lucide-react";
import type { BookingVertical } from "@/types/booking";
import type { Listing } from "@/types/catalog";
import { getPopularSearches } from "@/services/search";
import { VERTICAL_LIST } from "@/constants/verticals";
import { AutoListingCard } from "@/components/cards/auto-listing-card";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { VerticalIcon } from "@/components/shared/vertical-icon";
import { Reveal } from "@/components/shared/reveal";
import { cn } from "@/lib/utils";

type Scope = BookingVertical | "all";

interface SearchResultsProps {
  query: string;
  results: Listing[];
  /** Vertical pre-selected from the URL `?type=`. */
  initialType?: string;
}

/**
 * SearchResults — the interactive body of the /search page. Receives the full
 * ranked match set from the server and filters it by vertical client-side
 * (instant, no refetch). The refine bar re-runs the search via the URL.
 */
export function SearchResults({ query, results, initialType }: SearchResultsProps) {
  const router = useRouter();
  const [term, setTerm] = useState(query);

  const counts = useMemo(() => {
    const map = new Map<BookingVertical, number>();
    for (const l of results) map.set(l.vertical, (map.get(l.vertical) ?? 0) + 1);
    return map;
  }, [results]);

  const presentVerticals = useMemo(
    () => VERTICAL_LIST.filter((v) => counts.has(v.key)),
    [counts],
  );

  const validInitial =
    initialType && presentVerticals.some((v) => v.key === initialType)
      ? (initialType as BookingVertical)
      : "all";
  const [scope, setScope] = useState<Scope>(validInitial);

  const filtered = useMemo(
    () => (scope === "all" ? results : results.filter((l) => l.vertical === scope)),
    [results, scope],
  );

  const onRefine = (e: React.FormEvent) => {
    e.preventDefault();
    const q = term.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <>
      {/* Search header */}
      <section className="border-b border-line bg-surface-muted/40">
        <Container className="py-8 md:py-10">
          <h1 className="text-h2 text-ink">
            {query ? (
              <>
                Results for <span className="text-primary">“{query}”</span>
              </>
            ) : (
              "Search"
            )}
          </h1>
          <p className="mt-1 text-body">
            {query
              ? `${results.length} ${results.length === 1 ? "result" : "results"} across ${presentVerticals.length} ${presentVerticals.length === 1 ? "category" : "categories"}`
              : "Find stays, tours, transport and more."}
          </p>

          <form onSubmit={onRefine} className="mt-5 flex max-w-xl gap-2">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute inset-y-0 left-3.5 my-auto size-4 text-muted"
                aria-hidden="true"
              />
              <input
                type="search"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Refine your search…"
                aria-label="Search"
                className="h-12 w-full rounded-pill border border-line bg-surface pl-10 pr-4 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/25"
              />
            </div>
            <Button type="submit" size="lg" className="shrink-0">
              Search
            </Button>
          </form>
        </Container>
      </section>

      {/* Results */}
      <section className="py-10 md:py-14">
        <Container>
          {results.length === 0 ? (
            <EmptyState query={query} />
          ) : (
            <>
              {/* Vertical filter chips */}
              <div className="mb-8 flex flex-wrap gap-2">
                <Chip active={scope === "all"} onClick={() => setScope("all")}>
                  All
                  <Count>{results.length}</Count>
                </Chip>
                {presentVerticals.map((v) => (
                  <Chip
                    key={v.key}
                    active={scope === v.key}
                    onClick={() => setScope(v.key)}
                  >
                    <VerticalIcon name={v.icon} className="size-4" aria-hidden="true" />
                    {v.labelPlural}
                    <Count>{counts.get(v.key)}</Count>
                  </Chip>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((listing, index) => (
                  <Reveal key={listing.id} step={index % 3} className="h-full">
                    <AutoListingCard listing={listing} className="h-full" />
                  </Reveal>
                ))}
              </div>
            </>
          )}
        </Container>
      </section>
    </>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill border px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary text-white"
          : "border-line bg-surface text-body hover:border-primary hover:text-primary",
      )}
    >
      {children}
    </button>
  );
}

function Count({ children }: { children: React.ReactNode }) {
  return <span className="text-xs opacity-70">({children})</span>;
}

function EmptyState({ query }: { query: string }) {
  const popular = getPopularSearches();
  return (
    <div className="flex flex-col items-center gap-5 rounded-panel border border-dashed border-line py-20 text-center">
      <SearchX className="size-12 text-muted" aria-hidden="true" />
      <div>
        <p className="text-h3">No results{query ? ` for “${query}”` : ""}</p>
        <p className="mx-auto mt-2 max-w-md text-body">
          We couldn&apos;t find anything matching that. Check your spelling or try one
          of these popular searches.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {popular.map((p) => (
          <Link
            key={p}
            href={`/search?q=${encodeURIComponent(p)}`}
            className="rounded-pill border border-line bg-surface px-4 py-2 text-sm font-medium text-body transition-colors hover:border-primary hover:text-primary"
          >
            {p}
          </Link>
        ))}
      </div>
    </div>
  );
}
