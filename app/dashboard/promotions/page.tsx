import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { PromotionsList } from "@/features/dashboard/modules/promotions";

export const metadata: Metadata = { title: "Coupons" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["promotions:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Coupons"
        description="Standalone coupon codes and gift cards. Rule-based offers live under Offers; multi-product bundles under Combo Offers."
      />
      <PromotionsList />
    </PermissionGuard>
  );
}
