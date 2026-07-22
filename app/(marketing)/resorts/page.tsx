import { getAllListings } from "@/services/catalog";
import { ListingPage, listingMetadata } from "@/components/sections/listing";

export const metadata = listingMetadata("resorts");

export default async function ResortsPage() {
  const listings = await getAllListings("resorts");
  return <ListingPage vertical="resorts" listings={listings} />;
}
