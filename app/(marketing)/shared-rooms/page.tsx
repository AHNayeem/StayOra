import { getAllListings } from "@/services/catalog";
import { ListingPage, listingMetadata } from "@/components/sections/listing";

export const metadata = listingMetadata("shared-rooms");

export default async function SharedRoomsPage() {
  const listings = await getAllListings("shared-rooms");
  return <ListingPage vertical="shared-rooms" listings={listings} />;
}
