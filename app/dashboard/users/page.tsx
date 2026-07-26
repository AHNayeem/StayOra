import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { UsersList } from "@/features/dashboard/modules/users";

export const metadata: Metadata = { title: "Users" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["users:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Users"
        description="Platform user directory and access management."
      />
      <UsersList />
    </PermissionGuard>
  );
}
