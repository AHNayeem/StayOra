import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { RolesView } from "@/features/dashboard/modules/access";

export const metadata: Metadata = { title: "Roles" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["roles:read"]} fallback={<PermissionDenied />}>
      <PageHeader title="Roles" description="Define roles and their permission sets." />
      <RolesView />
    </PermissionGuard>
  );
}
