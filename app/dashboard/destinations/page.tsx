import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { DestinationList } from "@/features/dashboard/modules/destinations";

export const metadata: Metadata = { title: "Destinations" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["cms:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Destinations"
        description="The places travellers browse on the storefront — author, publish and retire them here."
      />
      <DestinationList />
    </PermissionGuard>
  );
}
