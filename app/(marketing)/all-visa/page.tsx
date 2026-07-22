import { getAllListings } from "@/services/catalog";
import { ListingPage, listingMetadata } from "@/components/sections/listing";

export const metadata = listingMetadata("visa");

export default async function VisaPage() {
  const listings = await getAllListings("visa");
  return <ListingPage vertical="visa" listings={listings} />;
}
