import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { NewsletterList } from "@/features/dashboard/modules/newsletter";

export const metadata: Metadata = { title: "Newsletter" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["cms:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Newsletter"
        description="Email audience, subscription status and acquisition sources."
      />
      <NewsletterList />
    </PermissionGuard>
  );
}
