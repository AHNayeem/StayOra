import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { PermissionsView } from "@/features/dashboard/modules/access";

export const metadata: Metadata = { title: "Permissions" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["permissions:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Permissions"
        description="Fine-grained permission catalogue and mapping."
      />
      <PermissionsView />
    </PermissionGuard>
  );
}
