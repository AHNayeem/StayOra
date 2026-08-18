import Link from "next/link";
import { Compass, Landmark, MapPin, Ticket } from "lucide-react";
import type { Destination } from "@/types/destination";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PageBanner } from "@/components/ui/page-banner";
import { PriceTag } from "@/components/ui/price-tag";
import { Section } from "@/components/ui/section";
import { Reveal } from "@/components/shared/reveal";
import { DestinationCard } from "@/components/cards/destination-card";
import { DetailBlock } from "@/components/sections/detail/detail-block";
import { DetailGallery } from "@/components/sections/detail/detail-gallery";
import { ListingCarousel } from "@/components/sections/listing-carousel";
import { NewsletterSection } from "@/components/sections/newsletter-section";
import { DESTINATIONS_HREF } from "../links";
import type { DestinationRelations } from "../related";

/**
 * The destination detail page body.
 *
 * Deliberately a plain component with no hooks and no `"use client"`: the route
 * renders it on the server for a seeded destination, and the client resolver
 * renders the *same* component for one the editor just created. Two copies of
 * this layout would have drifted within a week.
 */
export function DestinationDetailView({
  destination,
  relations,
}: {
  destination: Destination;
  relations: DestinationRelations;
}) {
  const {
    name,
    country,
    region,
    description,
    shortDescription,
    image,
    gallery = [],
    highlights = [],
    attractions = [],
    activities = [],
    startingPrice,
    status,
  } = destination;

  const place = region ? `${region}, ${country}` : country;
  const images = [image, ...gallery];
  const paragraphs = description.split(/\n{2,}/).filter(Boolean);
  const searchHref = `/search?q=${encodeURIComponent(name)}`;

  return (
    <main className="flex-1">
      <PageBanner
        title={name}
        description={shortDescription}
        image={image}
        imageAlt={`${name}, ${country}`}
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Destinations", href: DESTINATIONS_HREF },
          { label: name },
        ]}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-white/10 px-3 py-1.5 text-sm text-white">
            <MapPin className="size-4" aria-hidden="true" />
            {place}
          </span>
          {relations.listingCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-white/10 px-3 py-1.5 text-sm text-white">
              <Compass className="size-4" aria-hidden="true" />
              {relations.listingCount} places to book
            </span>
          )}
          {/* A draft or archived destination is only reachable in preview, and
              says so rather than passing for a live page. */}
          {status !== "published" && (
            <Badge variant="accent">{status === "draft" ? "Draft preview" : "Archived"}</Badge>
          )}
        </div>
      </PageBanner>

      {images.length > 1 && (
        <Section spacing="md">
          <DetailGallery images={images} title={name} />
        </Section>
      )}

      <Section background={images.length > 1 ? "muted" : "surface"} spacing="md">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-col gap-12">
            <DetailBlock title={`About ${name}`}>
              <div className="flex flex-col gap-4">
                {paragraphs.map((paragraph, index) => (
                  <p key={index} className="text-body">
                    {paragraph}
                  </p>
                ))}
              </div>
            </DetailBlock>

            {highlights.length > 0 && (
              <DetailBlock title="Why go" description={`What ${name} is known for.`}>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {highlights.map((highlight) => (
                    <li
                      key={highlight}
                      className="flex items-start gap-2.5 rounded-card border border-line bg-surface p-4 text-sm text-body"
                    >
                      <Compass className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                      {highlight}
                    </li>
                  ))}
                </ul>
              </DetailBlock>
            )}

            {attractions.length > 0 && (
              <DetailBlock
                title="Popular attractions"
                description="The sights most travellers build their days around."
              >
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {attractions.map((attraction) => (
                    <li
                      key={attraction}
                      className="flex items-center gap-2.5 rounded-card bg-surface-muted px-4 py-3 text-sm font-medium text-ink"
                    >
                      <Landmark className="size-4 shrink-0 text-primary" aria-hidden="true" />
                      {attraction}
                    </li>
                  ))}
                </ul>
              </DetailBlock>
            )}

            {activities.length > 0 && (
              <DetailBlock title="Things to do" description="Experiences worth booking ahead.">
                <ul className="grid gap-3 sm:grid-cols-2">
                  {activities.map((activity) => (
                    <li key={activity} className="flex items-center gap-2.5 text-sm text-body">
                      <Ticket className="size-4 shrink-0 text-primary" aria-hidden="true" />
                      {activity}
                    </li>
                  ))}
                </ul>
              </DetailBlock>
            )}
          </div>

          {/* Search / book CTA — the sidebar stays with the reader on desktop. */}
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-card border border-line bg-surface p-6 shadow-card">
              <h2 className="text-h4">Plan your trip to {name}</h2>
              {startingPrice && (
                <div className="mt-3">
                  <PriceTag price={startingPrice} from />
                </div>
              )}
              <p className="mt-3 text-sm text-body">
                Search every stay, tour and transfer we sell in {name}, with live
                availability and free cancellation on most bookings.
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <Link href={searchHref} className={buttonVariants({ variant: "primary", size: "md" })}>
                  Search {name}
                </Link>
                <Link
                  href={DESTINATIONS_HREF}
                  className={buttonVariants({ variant: "outline", size: "md" })}
                >
                  Browse all destinations
                </Link>
              </div>
              <dl className="mt-6 space-y-2 border-t border-line pt-5 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Country</dt>
                  <dd className="font-medium text-ink">{country}</dd>
                </div>
                {region && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Region</dt>
                    <dd className="font-medium text-ink">{region}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Places to book</dt>
                  <dd className="font-medium text-ink">{relations.listingCount}</dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </Section>

      {relations.stays.length > 0 && (
        <ListingCarousel
          items={relations.stays}
          eyebrow="Where to stay"
          title={`Stays in ${name}`}
          description="Hotels, resorts and apartments matched to this destination."
          background="surface"
        />
      )}

      {relations.experiences.length > 0 && (
        <ListingCarousel
          items={relations.experiences}
          eyebrow="Things to do"
          title={`Tours & activities in ${name}`}
          description="Guided days out and single-session experiences, bookable now."
          background="muted"
        />
      )}

      {relations.transport.length > 0 && (
        <ListingCarousel
          items={relations.transport}
          eyebrow="Getting around"
          title={`Transport in ${name}`}
          description="Airport transfers and local rides."
          background="surface"
        />
      )}

      {relations.related.length > 0 && (
        <Section background="muted">
          <h2 className="text-h2">More destinations</h2>
          <p className="mt-3 text-body">Other places travellers pair with {name}.</p>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
            {relations.related.map((related, index) => (
              <Reveal key={related.id} step={index % 4} className="h-full">
                <DestinationCard destination={related} className="h-full" />
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      <NewsletterSection />
    </main>
  );
}
