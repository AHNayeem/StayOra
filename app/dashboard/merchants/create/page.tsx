import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { MerchantCreateForm } from "@/features/dashboard/modules/merchants";

export const metadata: Metadata = { title: "Invite Merchant" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["merchants:create"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Invite merchant"
        description="Onboard and invite a new merchant organization."
      />
      <MerchantCreateForm />
    </PermissionGuard>
  );
}
