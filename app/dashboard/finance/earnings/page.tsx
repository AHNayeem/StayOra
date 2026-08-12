import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { MerchantEarnings } from "@/features/dashboard/modules/settlements";

export const metadata: Metadata = { title: "My earnings" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["finance:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="My earnings"
        description="Gross sales, commission, refunds, net earnings and settlement position."
      />
      <MerchantEarnings />
    </PermissionGuard>
  );
}
