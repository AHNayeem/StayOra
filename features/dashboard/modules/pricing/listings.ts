import type { Listing } from "@/types/catalog";
import { getAllListings } from "@/services/catalog";

/**
 * The properties the pricing screens can be pointed at.
 *
 * The full catalogue is thousands of rows and a `<select>` is not a search
 * interface, so the picker is capped at a workable slice — the same cap the
 * rate calendar and revenue manager already use, kept in one place so the three
 * screens always offer the same list.
 */
export async function pricingListings(): Promise<Listing[]> {
  const [hotels, resorts, apartments, shared] = await Promise.all([
    getAllListings("hotels"),
    getAllListings("resorts"),
    getAllListings("apartments"),
    getAllListings("shared-rooms"),
  ]);
  return [
    ...hotels.slice(0, 20),
    ...resorts.slice(0, 12),
    ...apartments.slice(0, 12),
    ...shared.slice(0, 8),
  ];
}
