import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { B2BStatements } from "@/features/dashboard/modules/b2b";

export const metadata: Metadata = { title: "B2B statements" };

/** Credit position, commercial terms and period statements for an account. */
export default function Page() {
  return (
    <PermissionGuard anyPermission={["b2b:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Statements & credit"
        description="Credit position, the account's commercial build-up, and its statement for a period."
      />
      <B2BStatements />
    </PermissionGuard>
  );
}
