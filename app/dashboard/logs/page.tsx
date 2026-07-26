import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { AuditLogsList } from "@/features/dashboard/modules/logs";

export const metadata: Metadata = { title: "Audit Logs" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["logs:read"]} fallback={<PermissionDenied />}>
      <PageHeader title="Audit Logs" description="Audit, login and API activity logs." />
      <AuditLogsList />
    </PermissionGuard>
  );
}
