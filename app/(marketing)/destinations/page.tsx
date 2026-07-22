import type { Metadata } from "next";
import { getDestinations } from "@/services/content";
import { DestinationCard } from "@/components/cards/destination-card";
import { PageBanner } from "@/components/ui/page-banner";
import { Section } from "@/components/ui/section";
import { Reveal } from "@/components/shared/reveal";
import { NewsletterSection } from "@/components/sections/newsletter-section";

const BANNER_IMAGE =
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1600&q=80";

export const metadata: Metadata = {
  title: "Destinations · Explore the world",
  description:
    "Browse our most-loved destinations and find where to go next — with stays, tours and experiences in each.",
  alternates: { canonical: "/destinations" },
};

/**
 * Destinations — a banner over a simple destination card grid (no filters, per
 * the design blueprint). Cards reveal on scroll for consistency with the rest of
 * the platform.
 */
export default async function DestinationsPage() {
  const destinations = await getDestinations();

  return (
    <main className="flex-1">
      <PageBanner
        title="Popular destinations"
        description="From island escapes to storied cities — discover where to travel next."
        image={BANNER_IMAGE}
        imageAlt="Popular destinations"
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Destinations" }]}
      />

      <Section>
        {destinations.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
            {destinations.map((destination, index) => (
              <Reveal key={destination.id} step={index % 4} className="h-full">
                <DestinationCard destination={destination} className="h-full" />
              </Reveal>
            ))}
          </div>
        ) : (
          <p className="text-center text-body">No destinations available yet.</p>
        )}
      </Section>

      <NewsletterSection />
    </main>
  );
}
