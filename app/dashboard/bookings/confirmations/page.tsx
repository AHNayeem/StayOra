import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { SupplierConfirmationsView } from "@/features/dashboard/modules/bookings";

export const metadata: Metadata = { title: "Supplier confirmations" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["bookings:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Supplier confirmations"
        description="Bookings waiting on the supplier to accept, and the decisions already made."
      />
      <SupplierConfirmationsView />
    </PermissionGuard>
  );
}
