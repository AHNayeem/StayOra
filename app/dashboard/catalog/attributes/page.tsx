import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { AttributesList } from "@/features/dashboard/modules/attributes";

export const metadata: Metadata = { title: "Attributes" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["catalog:read"]} fallback={<PermissionDenied />}>
      <PageHeader title="Attributes" description="Configurable listing attributes." />
      <AttributesList />
    </PermissionGuard>
  );
}
