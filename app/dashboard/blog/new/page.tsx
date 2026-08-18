import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { BlogForm } from "@/features/dashboard/modules/blog";

export const metadata: Metadata = { title: "Write Post" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["cms:create"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Write a post"
        description="Save it as a draft to keep working, or publish to put it live on /blogs."
      />
      <BlogForm />
    </PermissionGuard>
  );
}
