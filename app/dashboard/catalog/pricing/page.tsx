import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { PricingOverview } from "@/features/dashboard/modules/pricing";
import { pricingListings } from "@/features/dashboard/modules/pricing/listings";

export const metadata: Metadata = { title: "Dynamic pricing" };

/**
 * The merchant's pricing home — tiles, the base-versus-charged chart, and the
 * interactive calendar.
 *
 * The listings come from the catalogue seam on the server; every rate on the
 * page is resolved client-side by the pricing engine, so an edit here is the
 * price the next customer is quoted.
 */
export default async function Page() {
  const listings = await pricingListings();

  return (
    <PermissionGuard anyPermission={["catalog:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Dynamic pricing"
        description="What each night costs, why, and what you can change about it. One pricing path — the calendar below is what checkout charges."
      />
      <PricingOverview listings={listings} />
    </PermissionGuard>
  );
}
