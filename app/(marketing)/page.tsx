import type { Metadata } from "next";
import { Hero } from "@/components/sections/hero";
import { AboutSection } from "@/components/sections/about-section";
import { FeaturedDestinations } from "@/components/sections/featured-destinations";
import { PromoBanner } from "@/components/sections/promo-banner";
import { FeaturedListings } from "@/components/sections/featured-listings";
import { WhyChooseUs } from "@/components/sections/why-choose-us";
import { DealsSection } from "@/components/sections/deals-section";
import { LatestBlog } from "@/components/sections/latest-blog";
import { TestimonialsSection } from "@/components/sections/testimonials-section";
import { StatsSection } from "@/components/sections/stats-section";
import { NewsletterSection } from "@/components/sections/newsletter-section";
import { HOME_SECTIONS } from "@/constants/home";
import { getFeatured } from "@/services/catalog";
import {
  getBlogPosts,
  getDestinations,
  getFeatures,
  getOffers,
  getStats,
  getTestimonials,
} from "@/services/content";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/**
 * Home page. A Server Component: it fetches every section's data through the
 * service layer in parallel, then composes the landing page from the section +
 * card + primitive building blocks. Interactivity (scroll-reveal, count-up,
 * testimonial filter, newsletter form) is isolated in small client islands.
 */
export default async function HomePage() {
  const [
    destinations,
    tours,
    hotels,
    activities,
    transport,
    visas,
    features,
    offers,
    posts,
    testimonials,
    stats,
  ] = await Promise.all([
    getDestinations(6),
    getFeatured("tours", 3),
    getFeatured("hotels", 3),
    getFeatured("activities", 3),
    getFeatured("transport", 3),
    getFeatured("visa", 3),
    getFeatures(),
    getOffers(),
    getBlogPosts(3),
    getTestimonials(),
    getStats(),
  ]);

  return (
    <main className="flex-1">
      <Hero />

      <AboutSection />

      <FeaturedDestinations destinations={destinations} />

      <PromoBanner />

      <FeaturedListings
        items={tours}
        {...HOME_SECTIONS.tours}
        vertical="tours"
        background="surface"
      />

      <FeaturedListings
        items={hotels}
        {...HOME_SECTIONS.hotels}
        vertical="hotels"
        background="muted"
      />

      <FeaturedListings
        items={activities}
        {...HOME_SECTIONS.activities}
        vertical="activities"
        background="surface"
      />

      <FeaturedListings
        items={transport}
        {...HOME_SECTIONS.transport}
        vertical="transport"
        background="muted"
      />

      <WhyChooseUs features={features} />

      <DealsSection offers={offers} />

      <LatestBlog posts={posts} />

      <TestimonialsSection testimonials={testimonials} />

      <FeaturedListings
        items={visas}
        {...HOME_SECTIONS.visa}
        vertical="visa"
        background="surface"
      />

      <StatsSection stats={stats} />

      <NewsletterSection />
    </main>
  );
}
