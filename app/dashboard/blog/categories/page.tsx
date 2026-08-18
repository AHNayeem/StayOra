import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { BlogCategoryManager } from "@/features/dashboard/modules/blog";

export const metadata: Metadata = { title: "Blog Categories" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["cms:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Blog categories"
        description="How articles are grouped on /blogs. Renaming one updates every post filed under it."
      />
      <BlogCategoryManager />
    </PermissionGuard>
  );
}
