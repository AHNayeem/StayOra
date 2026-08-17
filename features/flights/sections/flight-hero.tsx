"use client";

import Image from "next/image";
import Link from "next/link";
import { Pin, PinOff, Search, X } from "lucide-react";
import type { FlightSearchQuery } from "@/types/flight";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";
import { FlightSearchPanel } from "../search/flight-search-panel";
import { searchHref } from "../query-url";
import {
  removeSearch,
  togglePinned,
  useFlightSearches,
} from "../saved-searches";

interface FlightHeroProps {
  /** Pre-fill the panel (deal deep-links, "edit search"). */
  initialQuery?: FlightSearchQuery;
  title?: string;
  subtitle?: string;
  backgroundImage?: string;
}

/**
 * FlightHero — the landing-page banner with the search panel overlaid, plus the
 * traveller's recent and pinned searches.
 *
 * Recent searches sit directly under the form because re-running a search is by
 * far the most common repeat action on a flight site — people compare over days,
 * not minutes, and retyping four fields each visit is the friction that sends
 * them elsewhere.
 */
export function FlightHero({
  initialQuery,
  title = "Find your next flight",
  subtitle = "Compare fares across 20+ airlines. Baggage, seats and extras priced up front — no surprises at checkout.",
  backgroundImage = "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1920&q=80",
}: FlightHeroProps) {
  const searches = useFlightSearches();

  return (
    <section className="relative">
      <div className="absolute inset-0 -z-10">
        <Image
          src={backgroundImage}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-b from-dark/75 via-dark/60 to-dark/80" />
      </div>

      <Container className="py-14 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-h1 text-white">{title}</h1>
          <p className="mt-4 text-base text-white/85 md:text-lg">{subtitle}</p>
        </div>

        <div className="mt-10">
          <FlightSearchPanel initialQuery={initialQuery} />
        </div>

        {searches.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-3 text-sm font-semibold text-white/85">
              Your searches
            </h2>
            <ul className="flex flex-wrap gap-2">
              {searches.slice(0, 8).map((entry) => (
                <li
                  key={entry.id}
                  className={cn(
                    "group flex h-9 items-center rounded-pill border transition-colors",
                    entry.pinned
                      ? "border-accent-400/60 bg-accent-500/20"
                      : "border-white/25 bg-white/10",
                  )}
                >
                  <Link
                    href={searchHref(entry.query)}
                    className={cn(
                      "flex h-full min-w-0 items-center gap-2 rounded-l-pill pl-3.5 pr-2 text-sm font-medium transition-colors",
                      entry.pinned
                        ? "text-white hover:bg-accent-500/25"
                        : "text-white/90 hover:bg-white/10",
                    )}
                  >
                    <Search className="size-3.5 shrink-0 opacity-70" aria-hidden="true" />
                    <span className="max-w-[18rem] truncate">{entry.label}</span>
                  </Link>
                  <span className="flex h-full shrink-0 items-center gap-0.5 pr-1">
                    <button
                      type="button"
                      onClick={() => togglePinned(entry.id)}
                      aria-label={entry.pinned ? "Unpin this search" : "Pin this search"}
                      className="grid size-7 shrink-0 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/15 hover:text-white"
                    >
                      {entry.pinned ? (
                        <PinOff className="size-3.5" aria-hidden="true" />
                      ) : (
                        <Pin className="size-3.5" aria-hidden="true" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSearch(entry.id)}
                      aria-label="Remove this search"
                      className="grid size-7 shrink-0 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/15 hover:text-white"
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Container>
    </section>
  );
}
