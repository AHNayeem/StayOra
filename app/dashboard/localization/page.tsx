import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { Localization } from "@/features/dashboard/modules/localization";

export const metadata: Metadata = { title: "Localization" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["localization:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Localization"
        description="Languages, currencies, exchange rates and translation coverage."
      />
      <Localization />
    </PermissionGuard>
  );
}
