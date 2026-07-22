import { getAllListings } from "@/services/catalog";
import { ListingPage, listingMetadata } from "@/components/sections/listing";

export const metadata = listingMetadata("convention-hall");

export default async function ConventionHallPage() {
  const listings = await getAllListings("convention-hall");
  return <ListingPage vertical="convention-hall" listings={listings} />;
}
