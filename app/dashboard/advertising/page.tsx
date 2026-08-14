import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { AdvertisingAdmin } from "@/features/dashboard/modules/advertising";

export const metadata: Metadata = { title: "Advertising" };

/** Merchant promotion — campaigns, placements, delivery and advertising revenue. */
export default function Page() {
  return (
    <PermissionGuard anyPermission={["promotions:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Advertising"
        description="Sponsored placements and campaign billing. Sponsored content is always labelled in the storefront."
      />
      <AdvertisingAdmin />
    </PermissionGuard>
  );
}
