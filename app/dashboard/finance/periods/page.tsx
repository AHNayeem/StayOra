import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { PeriodsView } from "@/features/dashboard/modules/finance";

export const metadata: Metadata = { title: "Period close" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["finance:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Period close"
        description="Freeze a month's figures so filed numbers stop moving when a refund lands."
      />
      <PeriodsView />
    </PermissionGuard>
  );
}
