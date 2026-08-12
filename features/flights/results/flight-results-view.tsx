"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Pencil,
  Pin,
  PinOff,
  RotateCcw,
  SearchX,
  SlidersHorizontal,
  TriangleAlert,
} from "lucide-react";
import type {
  FlightFilters as Filters,
  FlightSearchResult,
  FlightSort,
  PopularRoute,
} from "@/types/flight";
import {
  activeFilterCount,
  applyFilters,
  defaultFilters,
  sortOffers,
} from "@/services/flight.service";
import { CABIN_LABEL } from "@/lib/mock/fares";
import { airportLabel } from "@/lib/mock/airports";
import { AskAiButton } from "@/features/ai";
import { useLocale } from "@/features/i18n";
import { Container } from "@/components/ui/container";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Drawer } from "@/components/ui/drawer";
import { Select } from "@/components/ui/select";
import { FlightSearchPanel } from "../search/flight-search-panel";
import { PopularRoutes } from "../sections/popular-routes";
import {
  describeQuery,
  recordSearch,
  togglePinned,
  useFlightSearches,
} from "../saved-searches";
import { queryKey } from "../query-url";
import { FlightCard } from "./flight-card";
import { FlightFilters } from "./flight-filters";
import { PriceCalendar } from "./price-calendar";

/** Sort options in the order travellers reach for them. */
const SORTS: Array<{ value: FlightSort; label: string }> = [
  { value: "recommended", label: "Recommended" },
  { value: "cheapest", label: "Price: lowest first" },
  { value: "fastest", label: "Duration: shortest first" },
  { value: "earliest-departure", label: "Departure: earliest" },
  { value: "latest-departure", label: "Departure: latest" },
];

/** How many results render before "show more" — keeps first paint fast. */
const PAGE_SIZE = 10;

interface FlightResultsViewProps {
  result: FlightSearchResult;
  /** Fallback suggestions for the no-results state. */
  suggestions: PopularRoute[];
}

/**
 * FlightResultsView — the results page below the server-rendered search.
 *
 * The server does the search (so results are indexable, shareable and fast on
 * first paint); this client island owns everything *after* the fetch: filtering,
 * sorting, incremental reveal and the edit-search panel. That split is
 * deliberate — re-running the search on every filter click would be a network
 * round-trip for work that's already in memory, and the URL stays the record of
 * what was searched, not of how it's currently sorted.
 */
export function FlightResultsView({ result, suggestions }: FlightResultsViewProps) {
  const { money } = useLocale();
  const { query, offers, facets, priceCalendar } = result;

  const [filters, setFilters] = useState<Filters>(() => defaultFilters(facets));
  const [sort, setSort] = useState<FlightSort>("recommended");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [editing, setEditing] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Pin state is read straight from the store rather than mirrored into local
  // state, so pinning here and pinning from the hero can't drift apart.
  const searches = useFlightSearches();

  const key = queryKey(query);

  /**
   * Reset derived state when the search itself changes.
   *
   * A new search brings new facet bounds, so the price slider has to be
   * reseeded — carrying the previous range over would silently filter out
   * results the traveller never excluded. This is React's "adjusting state when
   * props change" pattern (a render-phase update keyed on the search), not an
   * effect: an effect would paint one frame with the stale filters applied to
   * the new offers, which is visible as a flash of "0 of 24 flights".
   */
  const [seenKey, setSeenKey] = useState(key);
  if (seenKey !== key) {
    setSeenKey(key);
    setFilters(defaultFilters(facets));
    setVisible(PAGE_SIZE);
    setSort("recommended");
  }

  // Recording the search is a write to an external store — a genuine effect,
  // with no setState of its own.
  useEffect(() => {
    if (offers.length === 0) return;
    recordSearch(query, new Date().toISOString());
  }, [key, offers.length, query]);

  const filtered = useMemo(() => applyFilters(offers, filters), [offers, filters]);
  const sorted = useMemo(() => sortOffers(filtered, sort), [filtered, sort]);
  const shown = sorted.slice(0, visible);

  const activeCount = activeFilterCount(filters, facets);
  const cheapest = filtered.length
    ? Math.min(...filtered.map((o) => o.fare.totalUsd))
    : 0;

  const onReset = () => {
    setFilters(defaultFilters(facets));
    setVisible(PAGE_SIZE);
  };

  const searchId = `fs_${key}`;
  const pinned = searches.some((s) => s.id === searchId && s.pinned);
  const onPin = () => togglePinned(searchId);

  const summary = query.legs.length
    ? `${airportLabel(query.legs[0].from)} ${query.tripType === "round-trip" ? "⇄" : "→"} ${airportLabel(query.legs[query.legs.length - 1].to)}`
    : "Flight search";

  return (
    <>
      {/* ---- Search summary bar --------------------------------------------- */}
      <div className="border-b border-line bg-surface-muted/60">
        <Container className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold text-ink">{summary}</h1>
              <p className="truncate text-sm text-muted">{describeQuery(query)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {offers.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onPin}
                  leftIcon={
                    pinned ? (
                      <PinOff className="size-4" aria-hidden="true" />
                    ) : (
                      <Pin className="size-4" aria-hidden="true" />
                    )
                  }
                >
                  {pinned ? "Unpin" : "Save search"}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing((v) => !v)}
                aria-expanded={editing}
                leftIcon={<Pencil className="size-4" aria-hidden="true" />}
              >
                {editing ? "Close" : "Edit search"}
              </Button>
            </div>
          </div>

          {editing && (
            <div className="mt-4">
              <FlightSearchPanel initialQuery={query} variant="compact" />
            </div>
          )}
        </Container>
      </div>

      <Container className="py-6 md:py-8">
        {offers.length === 0 ? (
          <NoResults suggestions={suggestions} onEdit={() => setEditing(true)} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start">
            {/* ---- Filters (desktop rail) ---------------------------------- */}
            <aside className="hidden lg:sticky lg:top-24 lg:block">
              <div className="rounded-card border border-line bg-surface p-5">
                <FlightFilters
                  facets={facets}
                  value={filters}
                  onChange={setFilters}
                  onReset={onReset}
                  activeCount={activeCount}
                />
              </div>
            </aside>

            {/* ---- Results ------------------------------------------------- */}
            <div className="min-w-0 space-y-4">
              {priceCalendar.length > 0 && (
                <PriceCalendar points={priceCalendar} query={query} />
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-body" role="status" aria-live="polite">
                  <span className="font-semibold text-ink">{filtered.length}</span> of{" "}
                  {offers.length} flight{offers.length === 1 ? "" : "s"}
                  {filtered.length > 0 && (
                    <>
                      {" "}
                      · from{" "}
                      <span className="font-semibold text-accent-600">
                        {money(cheapest)}
                      </span>
                    </>
                  )}
                </p>

                <div className="flex items-center gap-2">
                  {/* Contextual AI entry — the assistant already knows the route,
                      dates and cabin this results page was built from. */}
                  <AskAiButton
                    label="Help me choose"
                    prompt="Compare these flights"
                    page={{
                      label: `${airportLabel(query.legs[0].from)} → ${airportLabel(query.legs[query.legs.length - 1].to)}`,
                      destination: airportLabel(query.legs[query.legs.length - 1].to),
                      originCode: query.legs[0].from,
                      suggestions: [
                        "What's the fastest option?",
                        "Show me the cheapest",
                        "Show direct flights only",
                        "Find a hotel there",
                      ],
                    }}
                    className="h-9 px-4 text-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFiltersOpen(true)}
                    leftIcon={<SlidersHorizontal className="size-4" aria-hidden="true" />}
                    className="lg:hidden"
                  >
                    Filters
                    {activeCount > 0 && (
                      <Badge variant="primary" size="sm">
                        {activeCount}
                      </Badge>
                    )}
                  </Button>
                  <Select
                    aria-label="Sort results"
                    value={sort}
                    onChange={(e) => setSort(e.target.value as FlightSort)}
                    options={SORTS}
                    wrapperClassName="w-52"
                  />
                </div>
              </div>

              {filtered.length === 0 ? (
                <FilteredOut onReset={onReset} />
              ) : (
                <>
                  <ul className="space-y-4">
                    {shown.map((offer) => (
                      <li key={offer.id}>
                        <FlightCard offer={offer} />
                      </li>
                    ))}
                  </ul>

                  {visible < sorted.length && (
                    <div className="flex justify-center pt-2">
                      <Button
                        variant="outline"
                        size="md"
                        onClick={() => setVisible((v) => v + PAGE_SIZE)}
                      >
                        Show {Math.min(PAGE_SIZE, sorted.length - visible)} more flights
                      </Button>
                    </div>
                  )}

                  <p className="pt-2 text-center text-xs text-muted">
                    Fares include taxes, carrier charges and our booking fee, shown in{" "}
                    {CABIN_LABEL[query.cabin]}. Prices are re-confirmed before payment.
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </Container>

      {/* ---- Filters (mobile drawer) ---------------------------------------- */}
      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        side="bottom"
        size="lg"
        title="Filter flights"
      >
        <div className="p-5">
          <FlightFilters
            facets={facets}
            value={filters}
            onChange={setFilters}
            onReset={onReset}
            activeCount={activeCount}
          />
          <Button
            variant="primary"
            size="lg"
            fullWidth
            className="mt-6"
            onClick={() => setFiltersOpen(false)}
          >
            Show {filtered.length} flight{filtered.length === 1 ? "" : "s"}
          </Button>
        </div>
      </Drawer>
    </>
  );
}

/** Nothing matched the search itself — offer a way forward, not a dead end. */
function NoResults({
  suggestions,
  onEdit,
}: {
  suggestions: PopularRoute[];
  onEdit: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl py-8 text-center">
      <div className="mx-auto grid size-16 place-items-center rounded-full bg-surface-muted text-muted">
        <SearchX className="size-8" aria-hidden="true" />
      </div>
      <h2 className="mt-5 text-h4 text-ink">No flights on this route</h2>
      <p className="mx-auto mt-2 max-w-lg text-body">
        We couldn&apos;t find fares for these dates. Try nearby dates, remove the
        direct-only filter, or include alternative airports.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button variant="primary" size="md" onClick={onEdit}>
          Change search
        </Button>
        <Link href="/flights" className={buttonVariants({ variant: "outline", size: "md" })}>
          Back to flights
        </Link>
      </div>

      {suggestions.length > 0 && (
        <div className="mt-10 text-left">
          <h3 className="mb-3 text-center text-sm font-semibold text-ink">
            Popular routes you can book today
          </h3>
          <PopularRoutes routes={suggestions.slice(0, 6)} variant="list" />
        </div>
      )}
    </div>
  );
}

/** Results exist, but the active filters removed every one of them. */
function FilteredOut({ onReset }: { onReset: () => void }) {
  return (
    <div className="rounded-card border border-line bg-surface p-10 text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-full bg-accent-50 text-accent-600">
        <TriangleAlert className="size-7" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-base font-semibold text-ink">
        No flights match your filters
      </h2>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-body">
        Your search found flights, but none fit the current filters. Loosen one to see
        them again.
      </p>
      <Button
        variant="outline"
        size="md"
        onClick={onReset}
        leftIcon={<RotateCcw className="size-4" aria-hidden="true" />}
        className="mt-5"
      >
        Reset all filters
      </Button>
    </div>
  );
}
