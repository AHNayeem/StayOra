import { getAllListings } from "@/services/catalog";
import { ListingPage, listingMetadata } from "@/components/sections/listing";

export const metadata = listingMetadata("activities");

export default async function ActivitiesPage() {
  const listings = await getAllListings("activities");
  return <ListingPage vertical="activities" listings={listings} />;
}
