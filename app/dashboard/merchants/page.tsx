import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { MerchantsList } from "@/features/dashboard/modules/merchants";

export const metadata: Metadata = { title: "Merchants" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["merchants:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Merchants"
        description="Approve, suspend and manage merchant organizations."
      />
      <MerchantsList />
    </PermissionGuard>
  );
}
