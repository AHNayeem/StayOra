import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { PayoutsList } from "@/features/dashboard/modules/payouts";

export const metadata: Metadata = { title: "Payouts" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["finance:read"]} fallback={<PermissionDenied />}>
      <PageHeader title="Payouts" description="Merchant payouts and disbursements." />
      <PayoutsList />
    </PermissionGuard>
  );
}
