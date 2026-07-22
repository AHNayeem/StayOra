import { getAllListings } from "@/services/catalog";
import { ListingPage, listingMetadata } from "@/components/sections/listing";

export const metadata = listingMetadata("tours");

export default async function ToursPage() {
  const listings = await getAllListings("tours");
  return <ListingPage vertical="tours" listings={listings} />;
}
