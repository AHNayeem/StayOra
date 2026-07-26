import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { TaxList } from "@/features/dashboard/modules/tax";

export const metadata: Metadata = { title: "Tax" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["finance:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Tax"
        description="Configure tax rules and rates applied across bookings and payouts."
      />
      <TaxList />
    </PermissionGuard>
  );
}
