import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { CampaignsView } from "@/features/dashboard/modules/marketing";

export const metadata: Metadata = { title: "Campaigns" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["promotions:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Campaigns"
        description="Compose a message, target a segment, send it now or schedule it."
      />
      <CampaignsView />
    </PermissionGuard>
  );
}
