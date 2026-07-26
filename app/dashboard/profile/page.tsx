import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { ProfileView } from "@/features/dashboard/modules/profile";

export const metadata: Metadata = { title: "Profile" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["profile:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Profile"
        description="Your account details, security and preferences."
      />
      <ProfileView />
    </PermissionGuard>
  );
}
