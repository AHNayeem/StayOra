import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { VisaList } from "@/features/dashboard/modules/visa";

export const metadata: Metadata = { title: "Visa Services" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["catalog:read"]} fallback={<PermissionDenied />}>
      <PageHeader title="Visa Services" description="Visa processing services by country." />
      <VisaList />
    </PermissionGuard>
  );
}
