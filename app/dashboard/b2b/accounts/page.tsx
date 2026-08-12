import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { B2BAccountsList } from "@/features/dashboard/modules/b2b";

export const metadata: Metadata = { title: "B2B accounts" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["b2b:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="B2B accounts"
        description="Travel agencies, corporate clients and tour operators booking on credit."
      />
      <B2BAccountsList />
    </PermissionGuard>
  );
}
