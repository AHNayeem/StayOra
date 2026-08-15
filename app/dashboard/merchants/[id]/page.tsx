import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { getMerchant } from "@/features/dashboard/domain";
import { MerchantDetailView } from "@/features/dashboard/modules/merchants";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const merchant = getMerchant(id);
  return { title: merchant ? merchant.name : "Merchant" };
}

/**
 * A merchant's full profile and the platform's review console — onboarding,
 * verification, documents, commercial terms, payout, properties and staff.
 */
export default async function MerchantDetailPage({ params }: Params) {
  const { id } = await params;
  // The server reads the immutable seed; a merchant registered in this browser
  // exists only client-side, so an unknown id is resolved by the client view.
  const merchant = getMerchant(id);
  if (!merchant && !id.startsWith("mrc_")) notFound();

  return (
    <PermissionGuard anyPermission={["merchants:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        eyebrow="Merchants"
        title={merchant?.name ?? "Merchant"}
        description="Review the application, compliance, commercial terms and payout details."
      />
      <MerchantDetailView id={id} />
    </PermissionGuard>
  );
}
