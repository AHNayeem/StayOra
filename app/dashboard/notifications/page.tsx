import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { Tabs } from "@/features/dashboard/ui";
import {
  NotificationComposer,
  NotificationsView,
} from "@/features/dashboard/modules/notifications";

export const metadata: Metadata = { title: "Notifications" };

/**
 * Two halves of one thing: the operator's own notification feed, and the
 * outbound messaging console that renders templates and records deliveries.
 */
export default function Page() {
  return (
    <PermissionGuard anyPermission={["notifications:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Notifications"
        description="Your alerts, plus the customer messaging console and delivery report."
      />
      <Tabs
        items={[
          { key: "feed", label: "My alerts", content: <NotificationsView /> },
          { key: "outbound", label: "Customer messaging", content: <NotificationComposer /> },
        ]}
      />
    </PermissionGuard>
  );
}
