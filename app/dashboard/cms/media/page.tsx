import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { MediaList } from "@/features/dashboard/modules/media";

export const metadata: Metadata = { title: "Media Library" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["cms:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Media Library"
        description="Images, video and documents used across the storefront and content."
      />
      <MediaList />
    </PermissionGuard>
  );
}
