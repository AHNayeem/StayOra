import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { HomepageList } from "@/features/dashboard/modules/homepage";

export const metadata: Metadata = { title: "Homepage Builder" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["cms:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Homepage Builder"
        description="Arrange and toggle the sections that make up the storefront homepage."
      />
      <HomepageList />
    </PermissionGuard>
  );
}
