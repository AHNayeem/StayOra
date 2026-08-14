import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { InsuranceAdmin } from "@/features/dashboard/modules/insurance";

export const metadata: Metadata = { title: "Insurance" };

/** Demo insurance products, the policies sold, and the platform's margin on them. */
export default function Page() {
  return (
    <PermissionGuard anyPermission={["finance:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Insurance"
        description="Demo attach products — premium, provider share and platform commission."
      />
      <InsuranceAdmin />
    </PermissionGuard>
  );
}
