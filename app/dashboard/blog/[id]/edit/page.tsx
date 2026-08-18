import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { BlogEditor } from "@/features/dashboard/modules/blog";

/** Dynamic params for the post edit route (a Promise in the App Router). */
type Params = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Edit Post" };

export default async function Page({ params }: Params) {
  const { id } = await params;
  return (
    <PermissionGuard anyPermission={["cms:update"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Edit post"
        description="Changes appear on the public article as soon as you save."
      />
      <BlogEditor id={id} />
    </PermissionGuard>
  );
}
