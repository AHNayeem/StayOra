import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { BookingDetail } from "@/features/dashboard/modules/bookings";

/** Dynamic params for the booking detail route (a Promise in the App Router). */
type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  return { title: `Booking ${id}` };
}

export default async function BookingDetailPage({ params }: Params) {
  const { id } = await params;
  return (
    <PermissionGuard anyPermission={["bookings:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Booking detail"
        description="Reservation summary, guest, payment and audit trail."
      />
      <BookingDetail id={id} />
    </PermissionGuard>
  );
}
