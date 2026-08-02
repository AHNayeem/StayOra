import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { AirlinesList } from "@/features/dashboard/modules/flights";

export const metadata: Metadata = { title: "Airlines" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["flights:read"]} fallback={<PermissionDenied />}>
      <PageHeader title="Airlines" description="Carriers we sell, their alliances and commission rates." />
      <AirlinesList />
    </PermissionGuard>
  );
}
