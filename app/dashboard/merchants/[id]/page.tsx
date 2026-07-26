import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { getMerchantDetail, MerchantDetailView } from "@/features/dashboard/modules/merchants";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const merchant = await getMerchantDetail(id);
  return { title: merchant ? merchant.name : "Merchant" };
}

/** A single merchant's full profile — KYC, documents, wallet, settlement, audit. */
export default async function MerchantDetailPage({ params }: Params) {
  const { id } = await params;
  const merchant = await getMerchantDetail(id);
  if (!merchant) notFound();

  return (
    <PermissionGuard anyPermission={["merchants:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        eyebrow="Merchants"
        title={merchant.name}
        description="Review compliance, wallet and settlement for this merchant."
      />
      <MerchantDetailView id={id} />
    </PermissionGuard>
  );
}
