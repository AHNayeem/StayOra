import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { B2BBookingsList } from "@/features/dashboard/modules/b2b";

export const metadata: Metadata = { title: "B2B bookings" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["b2b:read", "bookings:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="B2B bookings"
        description="Bookings made by agency and corporate accounts on their credit line."
      />
      <B2BBookingsList />
    </PermissionGuard>
  );
}
