import type { Metadata } from "next";
import { PageBanner } from "@/components/ui/page-banner";
import { NewsletterSection } from "@/components/sections/newsletter-section";
import { DestinationsIndex } from "@/features/destinations";

const BANNER_IMAGE =
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1600&q=80";

export const metadata: Metadata = {
  title: "Destinations · Explore the world",
  description:
    "Browse our most-loved destinations and find where to go next — with stays, tours and experiences in each.",
  alternates: { canonical: "/destinations" },
};

/** `?q=` pre-fills the search box (the site-search JSON-LD target lands here). */
type PageProps = { searchParams: Promise<{ q?: string }> };

/**
 * Destinations index — banner, featured band, search/country facets and the card
 * grid.
 *
 * The grid itself lives in {@link DestinationsIndex}, a client component, for two
 * reasons: filtering shouldn't cost a round trip, and destinations created in the
 * dashboard are persisted in the browser. It still server-renders from the seed,
 * so the page is complete before any JavaScript runs.
 */
export default async function DestinationsPage({ searchParams }: PageProps) {
  const { q } = await searchParams;

  return (
    <main className="flex-1">
      <PageBanner
        title="Popular destinations"
        description="From island escapes to storied cities — discover where to travel next."
        image={BANNER_IMAGE}
        imageAlt="Popular destinations"
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Destinations" }]}
      />

      <DestinationsIndex initialSearch={q ?? ""} />

      <NewsletterSection />
    </main>
  );
}
