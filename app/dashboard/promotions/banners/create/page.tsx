import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { BannerForm } from "@/features/dashboard/modules/banners";

export const metadata: Metadata = { title: "Create Banner" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["promotions:create"]} fallback={<PermissionDenied />}>
      <PageHeader
        eyebrow="Promotions"
        title="Create banner"
        description="Add a new promotional banner to the storefront."
      />
      <BannerForm />
    </PermissionGuard>
  );
}
