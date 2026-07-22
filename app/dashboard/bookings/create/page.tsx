import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { BookingCreateForm } from "@/features/dashboard/modules/bookings";

export const metadata: Metadata = { title: "Create Booking" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["bookings:create"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Create booking"
        description="Create a new reservation on behalf of a customer."
      />
      <BookingCreateForm />
    </PermissionGuard>
  );
}
