import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { WalletList } from "@/features/dashboard/modules/wallet";

export const metadata: Metadata = { title: "Wallet" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["finance:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Wallet"
        description="Held, available and reserved balances for every merchant wallet."
      />
      <WalletList />
    </PermissionGuard>
  );
}
