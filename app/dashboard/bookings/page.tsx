import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { BookingsList } from "@/features/dashboard/modules/bookings";

export const metadata: Metadata = { title: "Bookings" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["bookings:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Bookings"
        description="Manage, assign, cancel, refund and rebook reservations."
      />
      <BookingsList />
    </PermissionGuard>
  );
}
