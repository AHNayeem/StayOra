import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { CmsPagesList } from "@/features/dashboard/modules/cms";

export const metadata: Metadata = { title: "CMS" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["cms:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="CMS"
        description="Pages, blocks, homepage builder, blog, FAQ and media."
      />
      <CmsPagesList />
    </PermissionGuard>
  );
}
