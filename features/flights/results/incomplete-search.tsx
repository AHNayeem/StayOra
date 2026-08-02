"use client";

import { Compass } from "lucide-react";
import type { FlightSearchQuery } from "@/types/flight";
import { Container } from "@/components/ui/container";
import { FlightSearchPanel } from "../search/flight-search-panel";

/**
 * IncompleteSearch — what `/flights/search` shows when the URL doesn't carry a
 * runnable query.
 *
 * That happens more than you'd think: a truncated share link, a bookmark from
 * before a route changed, an airline-only link from the partners list. None of
 * those are errors, so this isn't an error page — it's the search form, already
 * holding whatever the URL *did* provide, one field away from working.
 */
export function IncompleteSearch({ query }: { query: FlightSearchQuery }) {
  return (
    <Container className="py-12 md:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-primary-50 text-primary">
          <Compass className="size-7" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-h3 text-ink">Where are you flying?</h1>
        <p className="mt-2 text-body">
          This link is missing a route or date. Fill in the rest and we&apos;ll find
          your fares.
        </p>
      </div>

      <div className="mx-auto mt-8 max-w-5xl">
        <FlightSearchPanel initialQuery={query} />
      </div>
    </Container>
  );
}
