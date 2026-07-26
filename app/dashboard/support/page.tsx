import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { SupportList } from "@/features/dashboard/modules/support";

export const metadata: Metadata = { title: "Support" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["support:read"]} fallback={<PermissionDenied />}>
      <PageHeader title="Support" description="Support tickets and help resources." />
      <SupportList />
    </PermissionGuard>
  );
}
