import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { CommissionList } from "@/features/dashboard/modules/commission";

export const metadata: Metadata = { title: "Commission" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["finance:read"]} fallback={<PermissionDenied />}>
      <PageHeader title="Commission" description="Commission earned on merchant bookings." />
      <CommissionList />
    </PermissionGuard>
  );
}
