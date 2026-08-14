import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { RevenueManager } from "@/features/dashboard/modules/revenue-management";
import { getAllListings } from "@/services/catalog";

export const metadata: Metadata = { title: "Revenue management" };

/**
 * Revenue management — the analytical layer above the rate calendar.
 *
 * Same listings seam as Rates & availability; the metrics and recommendations
 * are resolved client-side from the inventory engine and the booking ledger, so
 * applying a recommendation changes what the next customer is quoted.
 */
export default async function Page() {
  const [hotels, resorts, apartments, shared] = await Promise.all([
    getAllListings("hotels"),
    getAllListings("resorts"),
    getAllListings("apartments"),
    getAllListings("shared-rooms"),
  ]);
  const listings = [
    ...hotels.slice(0, 20),
    ...resorts.slice(0, 12),
    ...apartments.slice(0, 12),
    ...shared.slice(0, 8),
  ];

  return (
    <PermissionGuard anyPermission={["catalog:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Revenue management"
        description="Occupancy, ADR, RevPAR, pace and forecast — with deterministic pricing recommendations you can apply."
      />
      <RevenueManager listings={listings} />
    </PermissionGuard>
  );
}
