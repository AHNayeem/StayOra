import { notFound } from "next/navigation";
import {
  getAllListings,
  getListingDetail,
  getRelatedListings,
} from "@/services/catalog";
import { ListingDetailPage, detailMetadata } from "@/components/sections/detail";

const VERTICAL = "convention-hall" as const;

/** Params for this dynamic route (a Promise in the App Router — always awaited). */
type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getAllListings(VERTICAL).then((listings) =>
    listings.map((listing) => ({ slug: listing.slug })),
  );
}

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  return detailMetadata(VERTICAL, slug);
}

export default async function ConventionHallDetailPage({ params }: Params) {
  const { slug } = await params;
  const [detail, related] = await Promise.all([
    getListingDetail(VERTICAL, slug),
    getRelatedListings(VERTICAL, slug),
  ]);
  if (!detail) notFound();
  return <ListingDetailPage detail={detail} related={related} />;
}
