import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { SupportInbox } from "@/features/dashboard/modules/support";

export const metadata: Metadata = { title: "Support" };

/**
 * The agent side of the shared support inbox. These are the same tickets the
 * traveller sees at `/account/support` — replying here reaches them there.
 */
export default function Page() {
  return (
    <PermissionGuard anyPermission={["support:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Support"
        description="Customer tickets, SLA tracking and replies — shared with the traveller's help centre."
      />
      <SupportInbox />
    </PermissionGuard>
  );
}
