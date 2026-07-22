"use client";

import { useMemo, useState } from "react";
import { SearchX } from "lucide-react";
import type { BookingVertical } from "@/types/booking";
import type { Listing } from "@/types/catalog";
import { AutoListingCard } from "@/components/cards/auto-listing-card";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Drawer } from "@/components/ui/drawer";
import { Pagination } from "@/components/ui/pagination";
import type { RangeValue } from "@/components/ui/price-range-slider";
import { Reveal } from "@/components/shared/reveal";
import { LISTING_FACETS, LISTING_PAGE_SIZE, DEFAULT_SORT, type SortKey } from "@/constants/listing";
import {
  buildFacetGroups,
  countActiveFilters,
  filterListings,
  priceBounds,
  sortListings,
  type ListingFilterState,
} from "@/lib/listing-filter";
import { ListingFilters } from "./listing-filters";
import { ListingResultsBar } from "./listing-results-bar";
import { PopularListings } from "./popular-listings";

interface ListingTemplateProps {
  vertical: BookingVertical;
  listings: Listing[];
}

/**
 * ListingTemplate — the interactive body of every listing page. It receives the
 * full vertical dataset as serializable props from the server page, then owns all
 * client state: search, price, facet selections, sort and pagination. Derived
 * views are memoised; every setState fires from an event handler (never an
 * effect), keeping it clear of react-hooks/set-state-in-effect. One component
 * serves all nine verticals — behaviour differs only by the facet config.
 */
export function ListingTemplate({ vertical, listings }: ListingTemplateProps) {
  const facets = LISTING_FACETS[vertical];
  const bounds = useMemo(() => priceBounds(listings), [listings]);
  const groups = useMemo(() => buildFacetGroups(listings, facets), [listings, facets]);

  const [search, setSearch] = useState("");
  const [price, setPrice] = useState<RangeValue>(bounds);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [sort, setSort] = useState<SortKey>(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const state: ListingFilterState = { search, price, facets: selected };
  const activeCount = countActiveFilters(state, bounds);

  const results = useMemo(() => {
    const active: ListingFilterState = { search, price, facets: selected };
    return sortListings(filterListings(listings, active, facets), sort);
  }, [listings, facets, search, price, selected, sort]);

  const pageCount = Math.max(1, Math.ceil(results.length / LISTING_PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = results.slice(
    (safePage - 1) * LISTING_PAGE_SIZE,
    safePage * LISTING_PAGE_SIZE,
  );

  const popular = useMemo(
    () =>
      [...listings]
        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
        .slice(0, 4),
    [listings],
  );

  // Every filter change resets to the first page (in-handler, not in an effect).
  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }
  function handlePrice(value: RangeValue) {
    setPrice(value);
    setPage(1);
  }
  function handleToggleFacet(key: string, value: string) {
    setSelected((prev) => {
      const current = prev[key] ?? [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [key]: next };
    });
    setPage(1);
  }
  function handleClear() {
    setSearch("");
    setPrice(bounds);
    setSelected({});
    setPage(1);
  }
  function handleSort(next: SortKey) {
    setSort(next);
    setPage(1);
  }

  const filtersPanel = (
    <ListingFilters
      bounds={bounds}
      groups={groups}
      state={state}
      activeCount={activeCount}
      onSearchChange={handleSearch}
      onPriceChange={handlePrice}
      onToggleFacet={handleToggleFacet}
      onClear={handleClear}
    />
  );

  return (
    <section className="bg-surface py-12 md:py-16">
      <Container>
        <div className="grid gap-8 lg:grid-cols-[300px_1fr] lg:gap-10">
          {/* Desktop sidebar */}
          <aside className="hidden flex-col gap-8 lg:flex">
            {filtersPanel}
            <PopularListings listings={popular} />
          </aside>

          {/* Results column */}
          <div className="flex flex-col gap-8">
            <ListingResultsBar
              total={results.length}
              sort={sort}
              onSortChange={handleSort}
              onOpenFilters={() => setDrawerOpen(true)}
              activeCount={activeCount}
            />

            {pageItems.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {pageItems.map((listing, index) => (
                    <Reveal key={listing.id} step={index % 3} className="h-full">
                      <AutoListingCard listing={listing} className="h-full" />
                    </Reveal>
                  ))}
                </div>

                <Pagination
                  page={safePage}
                  pageCount={pageCount}
                  onPageChange={setPage}
                  className="pt-2"
                />
              </>
            ) : (
              <div className="flex flex-col items-center gap-4 rounded-panel border border-dashed border-line py-20 text-center">
                <SearchX className="size-10 text-muted" aria-hidden="true" />
                <div>
                  <p className="text-h3">No matches found</p>
                  <p className="mt-1 text-body">
                    Try widening your price range or clearing a filter.
                  </p>
                </div>
                <Button variant="outline" onClick={handleClear}>
                  Clear all filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </Container>

      {/* Mobile filter drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        side="left"
        footer={
          <Button fullWidth onClick={() => setDrawerOpen(false)}>
            Show {results.length} {results.length === 1 ? "result" : "results"}
          </Button>
        }
      >
        {filtersPanel}
      </Drawer>
    </section>
  );
}
