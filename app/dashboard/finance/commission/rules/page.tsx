import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { CommissionRulesList } from "@/features/dashboard/modules/commission";

export const metadata: Metadata = { title: "Commission rules" };

/** Centralized commission configuration — the rate book the money engine reads. */
export default function Page() {
  return (
    <PermissionGuard anyPermission={["finance:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Commission rules"
        description="Configure what the platform charges, by vertical, merchant, product, rate plan, B2B account or insurance plan."
      />
      <CommissionRulesList />
    </PermissionGuard>
  );
}
