import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { HelpView } from "@/features/dashboard/modules/help";

export const metadata: Metadata = { title: "Help" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["dashboard:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Help & resources"
        description="Documentation, keyboard shortcuts and a direct line to support."
      />
      <HelpView />
    </PermissionGuard>
  );
}
