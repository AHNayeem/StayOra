import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { ApartmentsList } from "@/features/dashboard/modules/apartments";

export const metadata: Metadata = { title: "Apartments" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["catalog:read"]} fallback={<PermissionDenied />}>
      <PageHeader title="Apartments" description="Serviced apartment inventory." />
      <ApartmentsList />
    </PermissionGuard>
  );
}
