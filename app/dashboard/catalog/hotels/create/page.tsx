import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { HotelForm } from "@/features/dashboard/modules/catalog";

export const metadata: Metadata = { title: "Add Hotel" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["catalog:create"]} fallback={<PermissionDenied />}>
      <PageHeader
        eyebrow="Catalog"
        title="Add hotel"
        description="Create a new hotel listing for the catalog."
      />
      <HotelForm />
    </PermissionGuard>
  );
}
