import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { CommissionApprovalsList } from "@/features/dashboard/modules/commission";

export const metadata: Metadata = { title: "Commission approvals" };

/** The second pair of eyes on every commission rate change. */
export default function Page() {
  return (
    <PermissionGuard anyPermission={["finance:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Commission approvals"
        description="Proposed rate changes waiting on a decision, with what they would replace and why."
      />
      <CommissionApprovalsList />
    </PermissionGuard>
  );
}
