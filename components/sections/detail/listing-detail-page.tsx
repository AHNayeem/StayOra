import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import type { BookingVertical } from "@/types/booking";
import type { Listing } from "@/types/catalog";
import type { ListingDetail } from "@/types/detail";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { PageBanner } from "@/components/ui/page-banner";
import { RatingStars } from "@/components/ui/rating-stars";
import { FeaturedListings } from "@/components/sections/featured-listings";
import { NewsletterSection } from "@/components/sections/newsletter-section";
import { VERTICALS } from "@/constants/verticals";
import { getListingBySlug } from "@/services/catalog";
import { DetailGallery } from "./detail-gallery";
import { DetailOverview } from "./detail-overview";
import { DetailFacts } from "./detail-facts";
import { DetailItinerary } from "./detail-itinerary";
import { DetailMap } from "./detail-map";
import { DetailReviews } from "./detail-reviews";
import { DetailFaq } from "./detail-faq";
import { BookingWidget } from "./booking-widget";

/**
 * Build document metadata for a details route from the listing itself, so every
 * `[slug]/page.tsx` stays a one-liner. Returns a generic title for unknown slugs
 * (the page renders `notFound()` anyway).
 */
export async function detailMetadata(
  vertical: BookingVertical,
  slug: string,
): Promise<Metadata> {
  const listing = await getListingBySlug(vertical, slug);
  if (!listing) return { title: "Listing not found" };
  const config = VERTICALS[vertical];
  const url = `${config.href}/${slug}`;
  const description = `${listing.title} in ${listing.location.label}. Browse photos, highlights, reviews and live pricing — then book online in minutes.`;
  return {
    title: `${listing.title} · ${config.label}`,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title: listing.title,
      description,
      images: [{ url: listing.image, alt: listing.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: listing.title,
      description,
      images: [listing.image],
    },
  };
}

interface ListingDetailPageProps {
  detail: ListingDetail;
  /** Other listings in the same vertical for the "you may also like" rail. */
  related: Listing[];
}

/**
 * ListingDetailPage — the server-rendered shell shared by every details route.
 * A page banner (title, breadcrumb, location + rating meta) over the gallery and
 * a two-column body: scrollable content blocks beside a sticky {@link BookingWidget}.
 * Closed by a related rail and the global newsletter band. Config-driven, so one
 * component renders all nine verticals.
 */
export function ListingDetailPage({ detail, related }: ListingDetailPageProps) {
  const { listing } = detail;
  const config = VERTICALS[listing.vertical];

  return (
    <main className="flex-1">
      <PageBanner
        title={listing.title}
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: config.labelPlural, href: config.href },
          { label: listing.title },
        ]}
      >
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="inline-flex items-center gap-1.5 text-white/85">
            <MapPin className="size-4" aria-hidden="true" />
            {listing.location.label}
          </span>
          {listing.rating !== undefined && (
            <span className="inline-flex items-center gap-2">
              <RatingStars value={listing.rating} size="sm" />
              <span className="font-semibold text-white">{listing.rating.toFixed(1)}</span>
              {listing.reviewCount !== undefined && (
                <span className="text-white/70">
                  ({listing.reviewCount.toLocaleString()} reviews)
                </span>
              )}
            </span>
          )}
          {listing.badges?.map((badge) => (
            <Badge key={badge} variant="accent">
              {badge}
            </Badge>
          ))}
        </div>
      </PageBanner>

      <section className="bg-surface py-10 md:py-14">
        <Container>
          <DetailGallery images={detail.gallery} title={listing.title} />

          <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px] lg:items-start">
            <div className="flex flex-col gap-12">
              <DetailOverview
                title={listing.title}
                overview={detail.overview}
                highlights={detail.highlights}
              />
              <DetailFacts
                specs={detail.specs}
                amenities={detail.amenities}
                included={detail.included}
                excluded={detail.excluded}
              />
              <DetailItinerary steps={detail.itinerary} />
              <DetailMap location={listing.location} />
              <DetailReviews summary={detail.reviewSummary} reviews={detail.reviews} />
              <DetailFaq faqs={detail.faqs} />
            </div>

            <div className="lg:sticky lg:top-24">
              <BookingWidget listing={listing} />
            </div>
          </div>
        </Container>
      </section>

      {related.length > 0 && (
        <FeaturedListings
          items={related}
          eyebrow="Keep exploring"
          title={`More ${config.labelPlural.toLowerCase()} you may like`}
          vertical={listing.vertical}
          background="muted"
          columns={3}
        />
      )}

      <NewsletterSection />
    </main>
  );
}
