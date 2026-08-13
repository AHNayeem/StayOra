import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { UnifiedBookingsView } from "@/features/dashboard/modules/bookings/unified-view";

export const metadata: Metadata = { title: "All bookings" };

/**
 * The cross-vertical read view: stays, flights and unified trips in one table,
 * projected through the booking adapter. Each vertical keeps its own module for
 * anything that *changes* a booking.
 */
export default function Page() {
  return (
    <PermissionGuard anyPermission={["bookings:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="All bookings"
        description="Every booking across stays, flights and trips — one normalized read."
      />
      <UnifiedBookingsView />
    </PermissionGuard>
  );
}
