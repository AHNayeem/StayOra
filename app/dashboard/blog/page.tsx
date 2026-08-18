import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { BlogList } from "@/features/dashboard/modules/blog";

export const metadata: Metadata = { title: "Blog" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["cms:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Blog"
        description="The articles readers browse on the storefront — write, publish, unpublish and retire them here."
      />
      <BlogList />
    </PermissionGuard>
  );
}
