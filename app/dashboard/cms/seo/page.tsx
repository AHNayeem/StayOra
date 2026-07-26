import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { SeoList } from "@/features/dashboard/modules/seo";

export const metadata: Metadata = { title: "SEO" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["cms:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="SEO"
        description="Per-route meta titles, descriptions, canonicals and indexing rules."
      />
      <SeoList />
    </PermissionGuard>
  );
}
