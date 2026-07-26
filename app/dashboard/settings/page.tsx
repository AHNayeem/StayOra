import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { SettingsView } from "@/features/dashboard/modules/settings";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["settings:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Settings"
        description="Platform, notification and integration settings."
      />
      <SettingsView />
    </PermissionGuard>
  );
}
