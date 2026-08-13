import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { RateManager } from "@/features/dashboard/modules/inventory";
import { getAllListings } from "@/services/catalog";

export const metadata: Metadata = { title: "Rates & availability" };

/**
 * Revenue management for stay inventory.
 *
 * The listings come from the catalogue seam; the calendar itself is resolved
 * client-side from the inventory engine so an edit is reflected in customer
 * pricing on the very next quote.
 */
export default async function Page() {
  const [hotels, resorts, apartments, shared] = await Promise.all([
    getAllListings("hotels"),
    getAllListings("resorts"),
    getAllListings("apartments"),
    getAllListings("shared-rooms"),
  ]);
  // Cap the picker at a workable number — the full catalogue is thousands long.
  const listings = [
    ...hotels.slice(0, 20),
    ...resorts.slice(0, 12),
    ...apartments.slice(0, 12),
    ...shared.slice(0, 8),
  ];

  return (
    <PermissionGuard anyPermission={["catalog:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Rates & availability"
        description="Daily pricing, allotment, stop-sell and stay rules — the calendar the booking engine reads."
      />
      <RateManager listings={listings} />
    </PermissionGuard>
  );
}
