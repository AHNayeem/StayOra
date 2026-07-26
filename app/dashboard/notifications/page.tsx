import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { NotificationsView } from "@/features/dashboard/modules/notifications";

export const metadata: Metadata = { title: "Notifications" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["notifications:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Notifications"
        description="Notification centre and delivery preferences."
      />
      <NotificationsView />
    </PermissionGuard>
  );
}
