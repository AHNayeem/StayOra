import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { MaintenanceView } from "@/features/dashboard/modules/maintenance";

export const metadata: Metadata = { title: "Maintenance" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["system:update"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Maintenance"
        description="Take the storefront offline for scheduled work while keeping admin access."
      />
      <MaintenanceView />
    </PermissionGuard>
  );
}
