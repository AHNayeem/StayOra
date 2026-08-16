import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { RatePlansView } from "@/features/dashboard/modules/pricing";
import { pricingListings } from "@/features/dashboard/modules/pricing/listings";

export const metadata: Metadata = { title: "Rate plans" };

/**
 * The commercial packages a property sells: what they cost against the room's
 * rate, what they include, and the restrictions that come with them.
 */
export default async function Page() {
  const listings = await pricingListings();

  return (
    <PermissionGuard anyPermission={["catalog:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Rate plans"
        description="Standard, non-refundable, breakfast, half board, corporate — and any plan of your own. Selectable at checkout the moment they're active."
      />
      <RatePlansView listings={listings} />
    </PermissionGuard>
  );
}
