import type { Metadata } from "next";
import { Hero } from "@/components/sections/hero";
import { Hero2 } from "@/components/sections/hero2";

import { Partners } from "@/components/sections/partners";
import { DestinationSlider } from "@/components/sections/destination-slider";
import { ListingCarousel } from "@/components/sections/listing-carousel";
import { FeaturedListings } from "@/components/sections/featured-listings";
import { FlashDeals } from "@/components/sections/flash-deals";
import { PromoOffers } from "@/components/sections/promo-offers";
import { ComboDeals } from "@/components/sections/combo-deals";
import { TravelInspiration } from "@/components/sections/travel-inspiration";
import { TrendingPackages } from "@/components/sections/trending-packages";
import { PromoBanner } from "@/components/sections/promo-banner";
import { CountryCards } from "@/components/sections/country-cards";
import { DealsSection } from "@/components/sections/deals-section";
import { FeaturedDestinations } from "@/components/sections/featured-destinations";
import { WhyChooseUs } from "@/components/sections/why-choose-us";
import { StatsSection } from "@/components/sections/stats-section";
import { Awards } from "@/components/sections/awards";
import { LatestBlog } from "@/components/sections/latest-blog";
import { TestimonialsSection } from "@/components/sections/testimonials-section";
import { HomeFaqs } from "@/components/sections/home-faqs";
import { CtaSection } from "@/components/sections/cta-section";
import { NewsletterSection } from "@/components/sections/newsletter-section";
import { SponsoredRail } from "@/components/sections/sponsored-rail";
import { AiConciergeSection } from "@/features/ai";
import { FlightDeals } from "@/features/flights/sections/flight-deals";
import { PopularRoutes } from "@/features/flights/sections/popular-routes";
import { AirlinePartners } from "@/features/flights/sections/airline-partners";
import { HOME_SECTIONS } from "@/constants/home";
import { getFeatured } from "@/services/catalog";
import {
  getFlightDeals,
  getPartnerAirlines,
  getPopularRoutes,
} from "@/services/flight.service";
import {
  getAwards,
  getBlogPosts,
  getCountryHighlights,
  getDestinations,
  getFeatures,
  getFlashDeals,
  getInspirationThemes,
  getOffers,
  getPartners,
  getStats,
  getTestimonials,
  getTravelPackages,
} from "@/services/content";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/**
 * Home page — a content-rich, international travel-platform landing page. A
 * Server Component that fetches every band's data through the service layer in
 * parallel, then composes the page from reusable section + card + primitive
 * building blocks. All interactivity (animated search, scroll-reveal, count-up,
 * carousels, countdown timers, testimonial filter, newsletter form) is isolated
 * in small client islands, so the page itself stays a static server render.
 *
 * Backgrounds alternate surface / muted, punctuated by the dark stats band and
 * the image/gradient promo, CTA and newsletter panels, for a clear rhythm.
 */
export default async function HomePage() {
  const [
    partners,
    destinations,
    hotels,
    resorts,
    apartments,
    activities,
    tours,
    transport,
    visas,
    flashDeals,
    packages,
    countries,
    inspiration,
    offers,
    features,
    awards,
    stats,
    testimonials,
    posts,
    flightDeals,
    popularRoutes,
    airlinePartners,
  ] = await Promise.all([
    getPartners(),
    getDestinations(10),
    getFeatured("hotels", 10),
    getFeatured("resorts", 10),
    getFeatured("apartments", 8),
    getFeatured("activities", 10),
    getFeatured("tours", 8),
    getFeatured("transport", 10),
    getFeatured("visa", 8),
    getFlashDeals(),
    getTravelPackages(),
    getCountryHighlights(),
    getInspirationThemes(),
    getOffers(),
    getFeatures(),
    getAwards(),
    getStats(),
    getTestimonials(),
    getBlogPosts(3),
    getFlightDeals(8),
    getPopularRoutes(6),
    getPartnerAirlines(),
  ]);

  return (
    <main className="flex-1">
      {/* Hero + animated multi-vertical search */}
      {/* <Hero /> */}
      <Hero2 defaultVertical="hotels" />


      {/* Trust strip */}
      {/* <Partners partners={partners} /> */}

      {/* Homepage featured placements — always labelled, never mixed in with
          organic results. Delivery here drives advertising revenue. */}
      {/* <SponsoredRail placement="homepage_featured" title="Featured partners" /> */}

      {/* AI concierge — the highest-intent entry point on the page, placed
          directly under the hero so it reads as part of "how you search here". */}
      <AiConciergeSection />

      {/* Popular hotels */}
      <ListingCarousel
        items={hotels}
        {...HOME_SECTIONS.hotels}
        vertical="hotels"
        background="muted"
      />

      {/* Featured flight deals — the highest-intent rail on the page, so it
          sits directly under the first stays band rather than at the bottom. */}
      <FlightDeals deals={flightDeals} background="surface" />

      {/* Trending destinations slider */}
      <DestinationSlider destinations={destinations} />

      {/* Featured resorts */}
      <ListingCarousel
        items={resorts}
        {...HOME_SECTIONS.resorts}
        vertical="resorts"
        background="muted"
      />

      {/* Featured apartments */}
      <FeaturedListings
        items={apartments}
        {...HOME_SECTIONS.apartments}
        vertical="apartments"
        background="surface"
      />

      {/* Flash deals — live countdown + scarcity */}
      <FlashDeals deals={flashDeals} />

      {/* Travel inspiration bento */}
      <TravelInspiration themes={inspiration} />

      {/* Featured activities */}
      <ListingCarousel
        items={activities}
        {...HOME_SECTIONS.activities}
        vertical="activities"
        background="muted"
      />

      {/* Popular tours */}
      <FeaturedListings
        items={tours}
        {...HOME_SECTIONS.tours}
        vertical="tours"
        background="surface"
      />

      {/* Trending packages */}
      <TrendingPackages packages={packages} />

      {/* Combo bundles — live from the dashboard's promotions desk, priced by
          the domain's own bundle maths and limited by its real inventory. */}
      <ComboDeals background="surface" />

      {/* Members promo */}
      <PromoBanner />

      {/* Offers & promo codes — the campaigns currently running. The codes here
          are the ones the checkout accepts; nothing is hard-coded. */}
      <PromoOffers background="muted" />

      {/* Browse by country */}
      <CountryCards countries={countries} />

      {/* Popular flight routes */}
      <PopularRoutes
        routes={popularRoutes}
        title="Popular flight routes"
        subtitle="The city pairs our travellers fly most — tap through to live fares."
        background="muted"
      />

      {/* Transport */}
      <ListingCarousel
        items={transport}
        {...HOME_SECTIONS.transport}
        vertical="transport"
        background="surface"
      />

      {/* Visa services */}
      <FeaturedListings
        items={visas}
        {...HOME_SECTIONS.visa}
        vertical="visa"
        background="muted"
      />

      {/* Airline partners */}
      <AirlinePartners airlines={airlinePartners.slice(0, 8)} background="surface" />

      {/* Special offers */}
      <DealsSection offers={offers} />

      {/* Why choose us */}
      <WhyChooseUs features={features} />

      {/* Top destinations grid */}
      <FeaturedDestinations destinations={destinations} />

      {/* Statistics */}
      <StatsSection stats={stats} />

      {/* Awards */}
      <Awards awards={awards} />

      {/* Latest blogs */}
      <LatestBlog posts={posts} />

      {/* Testimonials */}
      <TestimonialsSection testimonials={testimonials} />

      {/* FAQs */}
      <HomeFaqs />

      {/* Closing CTA */}
      <CtaSection />

      {/* Newsletter */}
      <NewsletterSection />
    </main>
  );
}
