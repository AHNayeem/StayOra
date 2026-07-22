import { getAllListings } from "@/services/catalog";
import { ListingPage, listingMetadata } from "@/components/sections/listing";

export const metadata = listingMetadata("hotels");

export default async function HotelsPage() {
  const listings = await getAllListings("hotels");
  return <ListingPage vertical="hotels" listings={listings} />;
}
