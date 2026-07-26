import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { CustomersList } from "@/features/dashboard/modules/customers";

export const metadata: Metadata = { title: "Customers" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["customers:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Customers"
        description="Customer directory, profiles and booking history."
      />
      <CustomersList />
    </PermissionGuard>
  );
}
