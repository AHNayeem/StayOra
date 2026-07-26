import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { RefundsList } from "@/features/dashboard/modules/refunds";

export const metadata: Metadata = { title: "Refunds" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["finance:read"]} fallback={<PermissionDenied />}>
      <PageHeader title="Refunds" description="Booking refunds and cancellations." />
      <RefundsList />
    </PermissionGuard>
  );
}
