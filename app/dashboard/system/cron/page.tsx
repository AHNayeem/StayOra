import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { CronList } from "@/features/dashboard/modules/cron";

export const metadata: Metadata = { title: "Cron Jobs" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["system:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Cron Jobs"
        description="Scheduled background jobs — run history, next run and controls."
      />
      <CronList />
    </PermissionGuard>
  );
}
