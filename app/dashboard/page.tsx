import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { DashboardOverview } from "@/features/dashboard/modules/overview";

/**
 * Dashboard overview. Phase 4 connects the KPI grid, performance chart, recent
 * bookings and activity feed to the (stub) metrics service. Guarded by
 * `dashboard:read`.
 */
export default function DashboardOverviewPage() {
  return (
    <PermissionGuard anyPermission={["dashboard:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="A snapshot of platform performance across bookings, revenue and merchants."
      />
      <DashboardOverview />
    </PermissionGuard>
  );
}
