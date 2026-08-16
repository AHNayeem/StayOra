import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { PricingSettings } from "@/features/dashboard/modules/pricing";
import { pricingListings } from "@/features/dashboard/modules/pricing/listings";

export const metadata: Metadata = { title: "Pricing settings" };

/**
 * Platform pricing settings.
 *
 * The switches that belong to a market rather than to a rule — which weekdays
 * are the weekend, whether dynamic pricing is on, and how far a rule may move a
 * rate — plus the review list of configurations that are almost always wrong.
 */
export default async function Page() {
  const listings = await pricingListings();

  return (
    <PermissionGuard anyPermission={["settings:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Pricing settings"
        description="Weekend days, guard rails and the master switch — globally, or overridden per property."
      />
      <PricingSettings listings={listings} />
    </PermissionGuard>
  );
}
