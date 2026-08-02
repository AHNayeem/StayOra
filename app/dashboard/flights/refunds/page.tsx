import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { FlightRefundsList } from "@/features/dashboard/modules/flights";

export const metadata: Metadata = { title: "Flight refunds" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["flights:read"]} fallback={<PermissionDenied />}>
      <PageHeader title="Flight refunds" description="Refund requests awaiting review, approval or payout." />
      <FlightRefundsList />
    </PermissionGuard>
  );
}
