import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { BlogPreview } from "@/features/dashboard/modules/blog";

/** Dynamic params for the post preview route (a Promise in the App Router). */
type Params = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Preview Post" };

/**
 * Preview works for drafts and archives as well as live posts — reviewing a post
 * must not require publishing it first, which is the whole reason this route
 * keys off the internal id rather than the public slug.
 */
export default async function Page({ params }: Params) {
  const { id } = await params;
  return (
    <PermissionGuard anyPermission={["cms:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Preview post"
        description="Exactly what a reader will see, rendered from the same components as the live article."
      />
      <BlogPreview id={id} />
    </PermissionGuard>
  );
}
