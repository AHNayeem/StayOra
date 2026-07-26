import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { QueuesList } from "@/features/dashboard/modules/queues";

export const metadata: Metadata = { title: "Queues" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["system:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Queues"
        description="Background work queues — depth, throughput and failed jobs."
      />
      <QueuesList />
    </PermissionGuard>
  );
}
