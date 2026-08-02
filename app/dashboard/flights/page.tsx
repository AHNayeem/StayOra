import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { FlightsOverview } from "@/features/dashboard/modules/flights";

export const metadata: Metadata = { title: "Flights" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["flights:read"]} fallback={<PermissionDenied />}>
      <PageHeader title="Flights" description="Flight inventory, bookings and revenue at a glance." />
      <FlightsOverview />
    </PermissionGuard>
  );
}
