import type { Metadata } from "next";
import { Suspense } from "react";
import {
  getPopularRoutes,
  isQueryComplete,
  searchFlights,
} from "@/services/flight.service";
import { airportLabel } from "@/lib/mock/airports";
import { paramsToQuery, type RawSearchParams } from "@/features/flights/query-url";
import { FlightResultsView } from "@/features/flights/results/flight-results-view";
import { FlightResultsSkeleton } from "@/features/flights/results/results-skeleton";
import { IncompleteSearch } from "@/features/flights/results/incomplete-search";

type SearchPageProps = {
  /** `searchParams` is a Promise in the App Router — always awaited. */
  searchParams: Promise<RawSearchParams>;
};

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const query = paramsToQuery(await searchParams);
  const first = query.legs[0];
  const last = query.legs[query.legs.length - 1];

  const title = first
    ? `${airportLabel(first.from)} to ${airportLabel(last.to)} flights`
    : "Search flights";

  return {
    title,
    description: first
      ? `Compare fares from ${airportLabel(first.from)} to ${airportLabel(last.to)} across 20+ airlines, with baggage and fare rules shown up front.`
      : "Search and compare flight fares across 20+ airlines on Otithee.",
    // Result pages are per-query and shouldn't compete with the landing page
    // in search results, but their links are still worth following.
    robots: { index: false, follow: true },
  };
}

/**
 * Flight results.
 *
 * The search runs on the server so the first paint already has fares — a results
 * page that renders an empty shell and then fetches is the slowest possible
 * version of the most important screen in the module. Filtering and sorting then
 * happen client-side in {@link FlightResultsView} against the already-loaded set.
 *
 * `Suspense` around the async work lets the skeleton stream immediately while
 * the (deliberately realistic) search latency plays out.
 */
export default async function FlightSearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = paramsToQuery(params);

  // An incomplete query is a hand-edited or truncated URL, not an error — send
  // the traveller to a pre-filled search form rather than a 404 or a spinner.
  if (!isQueryComplete(query)) {
    return (
      <main className="flex-1">
        <IncompleteSearch query={query} />
      </main>
    );
  }

  return (
    <main className="flex-1">
      <Suspense fallback={<FlightResultsSkeleton />}>
        <Results params={params} />
      </Suspense>
    </main>
  );
}

/** The awaited half, isolated so `Suspense` has something to suspend on. */
async function Results({ params }: { params: RawSearchParams }) {
  const query = paramsToQuery(params);
  const [result, suggestions] = await Promise.all([
    searchFlights(query),
    getPopularRoutes(6),
  ]);

  return <FlightResultsView result={result} suggestions={suggestions} />;
}
