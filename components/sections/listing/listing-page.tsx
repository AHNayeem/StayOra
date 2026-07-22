import type { Metadata } from "next";
import type { BookingVertical } from "@/types/booking";
import type { Listing } from "@/types/catalog";
import { PageBanner } from "@/components/ui/page-banner";
import { NewsletterSection } from "@/components/sections/newsletter-section";
import { LISTING_PAGE } from "@/constants/listing";
import { VERTICALS } from "@/constants/verticals";
import { ListingTemplate } from "./listing-template";

/**
 * Build the document metadata for a vertical's listing route from the shared
 * page config, so each route file stays a one-liner.
 */
export function listingMetadata(vertical: BookingVertical): Metadata {
  const { title, description } = LISTING_PAGE[vertical];
  return {
    title: `${title} · ${VERTICALS[vertical].labelPlural}`,
    description,
    alternates: { canonical: VERTICALS[vertical].href },
  };
}

interface ListingPageProps {
  vertical: BookingVertical;
  listings: Listing[];
}

/**
 * ListingPage — the server-rendered shell shared by every listing route: the
 * page banner (title, description, breadcrumb) over the interactive
 * {@link ListingTemplate}, closed by the global newsletter band. Each vertical's
 * route file just fetches its data and renders this.
 */
export function ListingPage({ vertical, listings }: ListingPageProps) {
  const meta = LISTING_PAGE[vertical];
  const config = VERTICALS[vertical];

  return (
    <main className="flex-1">
      <PageBanner
        title={meta.title}
        description={meta.description}
        image={meta.bannerImage}
        imageAlt={config.labelPlural}
        breadcrumb={[{ label: "Home", href: "/" }, { label: config.labelPlural }]}
      />

      <ListingTemplate vertical={vertical} listings={listings} />

      <NewsletterSection />
    </main>
  );
}
