import type { Metadata } from "next";
import { LISTING_PAGE } from "@/constants/listing";
import {
  getFlightDeals,
  getPartnerAirlines,
  getPopularRoutes,
  getSeasonalOffers,
  normalizeQuery,
} from "@/services/flight.service";
import { FlightHero } from "@/features/flights/sections/flight-hero";
import { FlightDeals } from "@/features/flights/sections/flight-deals";
import { PopularRoutes } from "@/features/flights/sections/popular-routes";
import { AirlinePartners } from "@/features/flights/sections/airline-partners";
import { SeasonalOffers } from "@/features/flights/sections/seasonal-offers";
import { WhyFlyWithUs } from "@/features/flights/sections/why-fly-with-us";
import { HomeFaqs } from "@/components/sections/home-faqs";
import { NewsletterSection } from "@/components/sections/newsletter-section";

export const metadata: Metadata = {
  title: LISTING_PAGE.flights.title,
  description: LISTING_PAGE.flights.description,
  alternates: { canonical: "/flights" },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** First value of a possibly-repeated query param. */
function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/**
 * Flights landing page — search first, merchandising second.
 *
 * A Server Component that fetches every band through the flight service in
 * parallel, mirroring how the home page composes. The search panel, deal cards
 * and saved-search chips are the only client islands; everything else renders
 * statically.
 *
 * Accepts `?from=` / `?to=` so links from elsewhere (the global search dialog's
 * airport hits, a destination page) land on a *pre-filled* form rather than an
 * empty one — the traveller's intent shouldn't be discarded at the door.
 */
export default async function FlightsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const from = first(params.from).toUpperCase();
  const to = first(params.to).toUpperCase();

  const [deals, routes, airlines, seasonal] = await Promise.all([
    getFlightDeals(8),
    getPopularRoutes(12),
    getPartnerAirlines(),
    getSeasonalOffers(),
  ]);

  // Only pre-fill when there's something to pre-fill; the panel supplies its own
  // defaults (including the date) otherwise.
  const initialQuery =
    from || to
      ? normalizeQuery({
          tripType: "one-way" as const,
          // The date is left blank on purpose — the client panel fills in a
          // real "tomorrow" after hydration, which the server can't know.
          legs: [{ from: from || "DAC", to, date: "" }],
        })
      : undefined;

  return (
    <main className="flex-1">
      <FlightHero initialQuery={initialQuery} />
      <FlightDeals deals={deals} background="surface" />
      <PopularRoutes routes={routes} background="muted" />
      <WhyFlyWithUs />
      <SeasonalOffers offers={seasonal} background="muted" />
      <AirlinePartners airlines={airlines} background="surface" />
      <HomeFaqs />
      <NewsletterSection />
    </main>
  );
}
