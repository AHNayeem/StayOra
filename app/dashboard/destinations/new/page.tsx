import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { DestinationForm } from "@/features/dashboard/modules/destinations";

export const metadata: Metadata = { title: "Create Destination" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["cms:create"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Create destination"
        description="Save it as a draft to keep working, or publish to put it live on /destinations."
      />
      <DestinationForm />
    </PermissionGuard>
  );
}
