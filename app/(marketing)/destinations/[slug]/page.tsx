import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/shared/json-ld";
import { breadcrumbSchema, destinationSchema } from "@/lib/structured-data";
import {
  DestinationDetailView,
  DestinationResolver,
  destinationRelations,
  getDestinationBySlug,
  getDestinationBySlugSync,
  getDestinations,
} from "@/features/destinations";

/** Params for this dynamic route (a Promise in the App Router — always awaited). */
type Params = { params: Promise<{ slug: string }> };

/** Pre-render every published destination the prototype ships with. */
export async function generateStaticParams() {
  const destinations = await getDestinations({ status: "published" });
  return destinations.map((destination) => ({ slug: destination.slug }));
}

/**
 * Metadata built from the destination record: its SEO overrides when an editor
 * set them, its own copy otherwise. Nothing here knows about any one place.
 */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const destination = await getDestinationBySlug(slug);

  if (!destination) {
    return { title: "Destination not found", robots: { index: false, follow: true } };
  }

  const { name, country, metadata, shortDescription, description, image } = destination;
  const title = metadata?.seoTitle ?? `${name} Travel Guide & Stays`;
  const summary =
    metadata?.seoDescription ??
    shortDescription ??
    `${description.split("\n")[0].slice(0, 155)}…`;
  const url = `/destinations/${slug}`;

  return {
    title,
    description: summary,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title: `${name}, ${country}`,
      description: summary,
      images: [{ url: image, alt: `${name}, ${country}` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${name}, ${country}`,
      description: summary,
      images: [image],
    },
  };
}

/**
 * Destination detail.
 *
 * Resolution is always by slug through the destination service — there is no
 * per-place branching here, so adding a destination adds a working page.
 *
 * Three outcomes, in the order the server can be sure of them:
 *
 *  1. published — render the page.
 *  2. known but not published — `notFound()` straight away. The server *knows*
 *     this destination exists and isn't public, so a shared draft URL 404s with a
 *     real 404 status rather than waiting on the browser.
 *  3. unknown — hand it to {@link DestinationResolver}. In the prototype an
 *     editor's new destination lives in their browser, so only the client can
 *     say whether the slug is real.
 */
export default async function DestinationDetailPage({ params }: Params) {
  const { slug } = await params;
  const destination = await getDestinationBySlug(slug);

  if (!destination) {
    if (getDestinationBySlugSync(slug, { preview: true })) notFound();
    return <DestinationResolver slug={slug} />;
  }

  const published = await getDestinations({ status: "published" });
  const relations = destinationRelations(destination, { destinations: published });

  return (
    <>
      <JsonLd
        data={[
          destinationSchema(destination),
          breadcrumbSchema([
            { name: "Home", href: "/" },
            { name: "Destinations", href: "/destinations" },
            { name: destination.name },
          ]),
        ]}
      />
      <DestinationDetailView destination={destination} relations={relations} />
    </>
  );
}
