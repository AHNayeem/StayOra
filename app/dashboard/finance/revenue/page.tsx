import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { RevenueCenter } from "@/features/dashboard/modules/revenue-center";

export const metadata: Metadata = { title: "Revenue Center" };

/**
 * The Revenue Center — every platform revenue source in one place.
 *
 * Booking commission, service fees and the insurance margin are derived from
 * the booking ledger; membership, advertising and B2B subscriptions come from
 * the stored revenue entries. Nothing is counted twice.
 */
export default function Page() {
  return (
    <PermissionGuard anyPermission={["finance:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Revenue Center"
        description="How Otithee makes money — commission, fees, insurance, membership, advertising and B2B margin."
      />
      <RevenueCenter />
    </PermissionGuard>
  );
}
