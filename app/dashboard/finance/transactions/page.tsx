import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { TransactionsList } from "@/features/dashboard/modules/transactions";

export const metadata: Metadata = { title: "Transactions" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["finance:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Transactions"
        description="Every credit and debit that moves through the platform wallet."
      />
      <TransactionsList />
    </PermissionGuard>
  );
}
