import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { WaitlistView } from "@/features/dashboard/modules/marketing";

export const metadata: Metadata = { title: "Waitlist" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["catalog:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Waitlist"
        description="Demand for dates that were sold out, and who has been told they reopened."
      />
      <WaitlistView />
    </PermissionGuard>
  );
}
