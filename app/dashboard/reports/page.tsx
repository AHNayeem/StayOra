import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { ReportsView } from "@/features/dashboard/modules/reports";

export const metadata: Metadata = { title: "Reports" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["reports:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Reports"
        description="Build, filter and export dynamic reports."
      />
      <ReportsView />
    </PermissionGuard>
  );
}
