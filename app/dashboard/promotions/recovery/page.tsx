import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { RecoveryView } from "@/features/dashboard/modules/marketing";

export const metadata: Metadata = { title: "Abandoned checkouts" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["promotions:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Abandoned checkouts"
        description="Travellers who reached payment and left — and what recovery brought back."
      />
      <RecoveryView />
    </PermissionGuard>
  );
}
