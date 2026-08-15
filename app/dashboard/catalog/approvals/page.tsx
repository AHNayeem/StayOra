import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { CatalogueApprovalsView } from "@/features/dashboard/modules/catalogue-approvals";

export const metadata: Metadata = { title: "Catalogue approvals" };

/**
 * The catalogue approval workflow. Merchants manage and submit their own
 * products here; the platform reviews, approves, rejects and publishes.
 */
export default function Page() {
  return (
    <PermissionGuard anyPermission={["catalog:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        eyebrow="Catalog"
        title="Listings & approvals"
        description="Draft, submit, review and publish. Only published listings appear on Otithee."
      />
      <CatalogueApprovalsView />
    </PermissionGuard>
  );
}
