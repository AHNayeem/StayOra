"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import type { Airline } from "@/types/flight";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import { Badge } from "@/components/ui/badge";
import { searchHref } from "../query-url";
import { AirlineLogo } from "../airline-logo";

interface AirlinePartnersProps {
  airlines: Airline[];
  title?: string;
  subtitle?: string;
  background?: "surface" | "muted";
}

/**
 * AirlinePartners — the carriers we sell, each linking to a search filtered to
 * that airline. Shows on-time performance and rating because those are the two
 * things travellers actually use to choose between carriers on a route.
 */
export function AirlinePartners({
  airlines,
  title = "Airline partners",
  subtitle = "Fares from over twenty carriers, from full-service long-haul to regional low-cost.",
  background = "surface",
}: AirlinePartnersProps) {
  if (airlines.length === 0) return null;

  return (
    <Section background={background} id="airlines">
      <SectionHeader title={title} description={subtitle} align="center" />

      <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {airlines.map((airline) => (
          <li key={airline.code}>
            <Link
              href={searchHref({
                tripType: "one-way",
                legs: [],
                passengers: { adults: 1, children: 0, infants: 0 },
                cabin: "economy",
                directOnly: false,
                flexibleDates: false,
                nearbyAirports: false,
                refundableOnly: false,
                baggageIncluded: false,
                preferredAirlines: [airline.code],
              })}
              className="flex h-full items-center gap-3 rounded-card border border-line bg-surface p-4 transition-colors hover:border-primary"
            >
              <AirlineLogo code={airline.code} size="md" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">
                  {airline.name}
                </span>
                <span className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                  <span className="inline-flex items-center gap-0.5">
                    <Star
                      className="size-3 fill-accent-500 text-accent-500"
                      aria-hidden="true"
                    />
                    {airline.rating.toFixed(1)}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{airline.onTimePct}% on time</span>
                </span>
              </span>
              {airline.alliance !== "None" && (
                <Badge variant="outline" size="sm" className="hidden shrink-0 sm:inline-flex">
                  {airline.alliance.replace(" Alliance", "")}
                </Badge>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
