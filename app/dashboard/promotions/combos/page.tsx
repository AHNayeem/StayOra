import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { CombosList } from "@/features/dashboard/modules/offers";

export const metadata: Metadata = { title: "Combo offers" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["promotions:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Combo offers"
        description="Multi-product bundles across merchants — flight + hotel + transfer + activity."
      />
      <CombosList />
    </PermissionGuard>
  );
}
