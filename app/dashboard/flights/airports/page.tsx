import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { AirportsList } from "@/features/dashboard/modules/flights";

export const metadata: Metadata = { title: "Airports" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["flights:read"]} fallback={<PermissionDenied />}>
      <PageHeader title="Airports" description="Airport reference data used across search and ticketing." />
      <AirportsList />
    </PermissionGuard>
  );
}
