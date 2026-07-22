import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { PaymentsList } from "@/features/dashboard/modules/finance";

export const metadata: Metadata = { title: "Payments" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["finance:read"]} fallback={<PermissionDenied />}>
      <PageHeader title="Payments" description="Incoming payments and transactions." />
      <PaymentsList />
    </PermissionGuard>
  );
}
