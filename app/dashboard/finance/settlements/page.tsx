import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { SettlementsList } from "@/features/dashboard/modules/settlements";

export const metadata: Metadata = { title: "Settlements" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["finance:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Settlements"
        description="Merchant payout batches — gross sales less commission and refund adjustments."
      />
      <SettlementsList />
    </PermissionGuard>
  );
}
