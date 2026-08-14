import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { MembershipAdmin } from "@/features/dashboard/modules/membership";

export const metadata: Metadata = { title: "Membership" };

/** Paid StayOra membership — plans, subscribers and subscription revenue. */
export default function Page() {
  return (
    <PermissionGuard anyPermission={["finance:read", "customers:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Membership"
        description="Premium membership plans, subscribers and the revenue they generate."
      />
      <MembershipAdmin />
    </PermissionGuard>
  );
}
