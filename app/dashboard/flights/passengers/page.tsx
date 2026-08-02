import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { PassengersList } from "@/features/dashboard/modules/flights";

export const metadata: Metadata = { title: "Passengers" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["flights:read"]} fallback={<PermissionDenied />}>
      <PageHeader title="Passengers" description="Traveller manifests, documents and check-in status." />
      <PassengersList />
    </PermissionGuard>
  );
}
