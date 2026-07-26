import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { DisputesList } from "@/features/dashboard/modules/disputes";

export const metadata: Metadata = { title: "Disputes" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["finance:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Disputes"
        description="Chargebacks and payment disputes — submit evidence and record outcomes."
      />
      <DisputesList />
    </PermissionGuard>
  );
}
