import { getAllListings } from "@/services/catalog";
import { ListingPage, listingMetadata } from "@/components/sections/listing";

export const metadata = listingMetadata("apartments");

export default async function ApartmentsPage() {
  const listings = await getAllListings("apartments");
  return <ListingPage vertical="apartments" listings={listings} />;
}
