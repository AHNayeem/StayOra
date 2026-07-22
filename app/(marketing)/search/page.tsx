import type { Metadata } from "next";
import { searchListings } from "@/services/search";
import { SearchResults } from "./search-results";

/** searchParams is a Promise in the App Router — always awaited. */
type SearchPageProps = {
  searchParams: Promise<{ q?: string; type?: string }>;
};

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const title = q ? `Search: ${q}` : "Search";
  return {
    title,
    description: q
      ? `Search results for “${q}” across stays, tours, transport and more.`
      : "Search stays, tours, transport and destinations on StayOra.",
    robots: { index: false, follow: true },
  };
}

/**
 * Global search results. The query is read from `?q=`, matched across every
 * vertical by the search service, and handed to the client view which filters
 * by category on the client. Rendered on demand (dynamic) per query.
 */
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q = "", type } = await searchParams;
  const results = q.trim() ? await searchListings(q) : [];

  return (
    <main className="flex-1">
      <SearchResults query={q.trim()} results={results} initialType={type} />
    </main>
  );
}
