import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { ReconciliationList } from "@/features/dashboard/modules/reconciliation";

export const metadata: Metadata = { title: "Reconciliation" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["finance:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Reconciliation"
        description="Match gateway settlements against platform records and resolve variances."
      />
      <ReconciliationList />
    </PermissionGuard>
  );
}
