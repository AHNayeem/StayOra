import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { FlightBookingsList } from "@/features/dashboard/modules/flights";

export const metadata: Metadata = { title: "Flight bookings" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["flights:read"]} fallback={<PermissionDenied />}>
      <PageHeader title="Flight bookings" description="Every flight reservation, its fare and our commission." />
      <FlightBookingsList />
    </PermissionGuard>
  );
}
