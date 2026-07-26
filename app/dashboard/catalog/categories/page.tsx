import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { CategoriesList } from "@/features/dashboard/modules/categories";

export const metadata: Metadata = { title: "Categories" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["catalog:read"]} fallback={<PermissionDenied />}>
      <PageHeader title="Categories" description="Listing categories and taxonomy." />
      <CategoriesList />
    </PermissionGuard>
  );
}
