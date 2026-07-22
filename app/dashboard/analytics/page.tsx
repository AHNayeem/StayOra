import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { AnalyticsDashboard } from "@/features/dashboard/modules/analytics";

export const metadata: Metadata = { title: "Analytics" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["analytics:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        eyebrow="Insights"
        title="Analytics"
        description="Traffic, revenue trend, conversion funnel and booking mix across the platform."
      />
      <AnalyticsDashboard />
    </PermissionGuard>
  );
}
