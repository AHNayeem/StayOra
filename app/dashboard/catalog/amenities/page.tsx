import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { AmenitiesList } from "@/features/dashboard/modules/amenities";

export const metadata: Metadata = { title: "Amenities" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["catalog:read"]} fallback={<PermissionDenied />}>
      <PageHeader title="Amenities" description="Property and room amenities." />
      <AmenitiesList />
    </PermissionGuard>
  );
}
