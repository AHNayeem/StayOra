import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { BannersList } from "@/features/dashboard/modules/banners";

export const metadata: Metadata = { title: "Banners" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["promotions:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        eyebrow="Promotions"
        title="Banners"
        description="Promotional strips and heroes shown across the storefront."
      />
      <BannersList />
    </PermissionGuard>
  );
}
