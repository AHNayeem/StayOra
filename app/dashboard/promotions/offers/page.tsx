import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { OffersList } from "@/features/dashboard/modules/offers";

export const metadata: Metadata = { title: "Offers" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["promotions:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Offers"
        description="Platform and merchant offers — discounts, promo codes, eligibility and limits."
      />
      <OffersList />
    </PermissionGuard>
  );
}
