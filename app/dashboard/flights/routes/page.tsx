import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { RoutesList } from "@/features/dashboard/modules/flights";

export const metadata: Metadata = { title: "Routes" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["flights:read"]} fallback={<PermissionDenied />}>
      <PageHeader title="Routes" description="City pairs, operating carriers and lead-in fares." />
      <RoutesList />
    </PermissionGuard>
  );
}
