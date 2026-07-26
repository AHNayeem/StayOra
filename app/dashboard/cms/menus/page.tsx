import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { MenuList } from "@/features/dashboard/modules/menus";

export const metadata: Metadata = { title: "Menus" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["cms:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Menus"
        description="Header, footer and legal navigation shown across the storefront."
      />
      <MenuList />
    </PermissionGuard>
  );
}
