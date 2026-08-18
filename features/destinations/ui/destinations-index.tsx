"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import { Reveal } from "@/components/shared/reveal";
import { DestinationCard } from "@/components/cards/destination-card";
import { cn } from "@/lib/utils";
import { useDestinations } from "../hooks";

/**
 * The `/destinations` body: featured band, search, country facet and the card
 * grid.
 *
 * A client component so it can (a) filter without a round trip and (b) show
 * destinations the editor created in this browser, which the server cannot see.
 * The list still renders on the server from the seed — `useDestinations` hands
 * SSR the seed snapshot — so the page is complete without JavaScript and only
 * gains locally-created destinations after hydration.
 */
export function DestinationsIndex({ initialSearch = "" }: { initialSearch?: string }) {
  const [search, setSearch] = useState(initialSearch);
  const [country, setCountry] = useState("");

  const published = useDestinations({ status: "published" });

  const countries = useMemo(() => {
    const set = new Set(published.map((row) => row.country));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [published]);

  const filtering = Boolean(search.trim() || country);

  const results = useMemo(() => {
    const term = search.trim().toLowerCase();
    return published.filter((row) => {
      if (country && row.country !== country) return false;
      if (!term) return true;
      return [row.name, row.country, row.region, row.shortDescription]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [published, search, country]);

  const featured = useMemo(() => published.filter((row) => row.featured), [published]);

  // Nothing published at all is a different problem from a filter that matched
  // nothing, and needs a different message.
  if (published.length === 0) {
    return (
      <Section>
        <div className="mx-auto max-w-md text-center">
          <h2 className="text-h3">No destinations available yet</h2>
          <p className="mt-3 text-body">
            Destinations appear here as soon as they are published. In the
            meantime, browse what we have on sale.
          </p>
          <Link
            href="/hotels"
            className={cn(buttonVariants({ variant: "primary", size: "md" }), "mt-6")}
          >
            Browse stays
          </Link>
        </div>
      </Section>
    );
  }

  return (
    <>
      {featured.length > 0 && !filtering && (
        <Section spacing="md">
          <SectionHeader
            eyebrow="Editor's picks"
            title="Featured destinations"
            description="The places our travellers book most this season."
          />
          <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
            {featured.map((destination, index) => (
              <Reveal key={destination.id} step={index % 4} className="h-full">
                <DestinationCard destination={destination} className="h-full" />
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      <Section background={featured.length > 0 && !filtering ? "muted" : "surface"}>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-h3">All destinations</h2>
            <p aria-live="polite" className="mt-2 text-sm text-muted">
              {results.length} {results.length === 1 ? "destination" : "destinations"}
              {country ? ` in ${country}` : ""}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              type="search"
              label="Search destinations"
              placeholder="Try “Bali” or “Thailand”"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              leftIcon={<Search className="size-4" aria-hidden="true" />}
              wrapperClassName="w-full sm:w-64"
            />
            <Select
              label="Country"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              options={[
                { value: "", label: "All countries" },
                ...countries.map((name) => ({ value: name, label: name })),
              ]}
              wrapperClassName="w-full sm:w-52"
            />
          </div>
        </div>

        {results.length > 0 ? (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
            {results.map((destination, index) => (
              <Reveal key={destination.id} step={index % 4} className="h-full">
                <DestinationCard destination={destination} className="h-full" />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-card border border-line bg-surface p-10 text-center">
            <h3 className="text-h4">No destinations match that</h3>
            <p className="mt-2 text-body">
              Try a shorter search, or clear the filters to see all{" "}
              {published.length} destinations.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCountry("");
              }}
              className={cn(buttonVariants({ variant: "outline", size: "md" }), "mt-6 gap-2")}
            >
              <X className="size-4" aria-hidden="true" />
              Clear filters
            </button>
          </div>
        )}
      </Section>
    </>
  );
}
