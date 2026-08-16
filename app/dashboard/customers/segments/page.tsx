import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { SegmentsView } from "@/features/dashboard/modules/marketing";

export const metadata: Metadata = { title: "Segments" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["customers:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Segments"
        description="Customer cohorts computed from booking history, membership and intent."
      />
      <SegmentsView />
    </PermissionGuard>
  );
}
