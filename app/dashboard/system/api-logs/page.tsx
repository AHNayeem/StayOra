import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { ApiLogsList } from "@/features/dashboard/modules/api-logs";

export const metadata: Metadata = { title: "API Logs" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["logs:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="API Logs"
        description="Every request hitting the platform API — status, latency and client."
      />
      <ApiLogsList />
    </PermissionGuard>
  );
}
