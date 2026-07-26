import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { StorageList } from "@/features/dashboard/modules/storage";

export const metadata: Metadata = { title: "Storage" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["system:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Storage"
        description="Object storage buckets and disks — usage, capacity and object counts."
      />
      <StorageList />
    </PermissionGuard>
  );
}
