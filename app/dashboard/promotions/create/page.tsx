import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { PromotionForm } from "@/features/dashboard/modules/promotions";

export const metadata: Metadata = { title: "Create Promotion" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["promotions:create"]} fallback={<PermissionDenied />}>
      <PageHeader
        eyebrow="Promotions"
        title="Create promotion"
        description="Set up a new coupon, flash sale, offer or campaign."
      />
      <PromotionForm />
    </PermissionGuard>
  );
}
