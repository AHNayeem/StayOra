import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { CatalogueProductsView } from "@/features/dashboard/modules/catalogue-products";

export const metadata: Metadata = { title: "Shared Rooms" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["catalog:read"]} fallback={<PermissionDenied />}>
      <PageHeader title="Shared Rooms" description="Hostel and dormitory bed inventory." />
      <CatalogueProductsView vertical="shared-rooms" />
    </PermissionGuard>
  );
}
