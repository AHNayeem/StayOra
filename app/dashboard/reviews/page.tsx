import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { ReviewsList } from "@/features/dashboard/modules/reviews";

export const metadata: Metadata = { title: "Reviews" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["reviews:read"]} fallback={<PermissionDenied />}>
      <PageHeader title="Reviews" description="Moderation queue for customer reviews." />
      <ReviewsList />
    </PermissionGuard>
  );
}
