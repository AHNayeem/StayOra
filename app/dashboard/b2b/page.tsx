import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { B2BOverview } from "@/features/dashboard/modules/b2b";

export const metadata: Metadata = { title: "B2B" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["b2b:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="B2B"
        description="Agency and corporate travel commerce — net rates, markup, credit and settlement."
      />
      <B2BOverview />
    </PermissionGuard>
  );
}
