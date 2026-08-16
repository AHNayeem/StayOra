import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { PricingRulesView } from "@/features/dashboard/modules/pricing";
import { pricingListings } from "@/features/dashboard/modules/pricing/listings";

export const metadata: Metadata = { title: "Pricing rules" };

/**
 * Seasons, holidays, weekends, demand bands, booking window, length of stay,
 * guest count and discounts — one list, because they are one model.
 */
export default async function Page() {
  const listings = await pricingListings();

  return (
    <PermissionGuard anyPermission={["catalog:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Pricing rules"
        description="Every reason a rate moves, with the priority that decides what happens when several apply to the same night."
      />
      <PricingRulesView listings={listings} />
    </PermissionGuard>
  );
}
