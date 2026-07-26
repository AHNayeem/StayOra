import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { TemplateList } from "@/features/dashboard/modules/templates";

export const metadata: Metadata = { title: "Notification Templates" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["system:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Notification Templates"
        description="Email, SMS and push messages the platform sends on events."
      />
      <TemplateList />
    </PermissionGuard>
  );
}
