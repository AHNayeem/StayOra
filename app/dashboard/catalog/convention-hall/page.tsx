import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { ConventionHallList } from "@/features/dashboard/modules/convention-hall";

export const metadata: Metadata = { title: "Convention Halls" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["catalog:read"]} fallback={<PermissionDenied />}>
      <PageHeader title="Convention Halls" description="Event and convention venue inventory." />
      <ConventionHallList />
    </PermissionGuard>
  );
}
