import { getAllListings } from "@/services/catalog";
import { ListingPage, listingMetadata } from "@/components/sections/listing";

export const metadata = listingMetadata("transport");

export default async function TransportPage() {
  const listings = await getAllListings("transport");
  return <ListingPage vertical="transport" listings={listings} />;
}
