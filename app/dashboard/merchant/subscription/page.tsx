import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import {
  MerchantCapabilityGuard,
  MerchantSubscriptionView,
} from "@/features/dashboard/modules/merchant-workspace";

export const metadata: Metadata = { title: "Subscription" };

export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow="My business"
        title="Subscription"
        description="Your plan decides your limits and which tools you can use. It never changes your commission."
      />
      <MerchantCapabilityGuard capability="subscription.manage">
        <MerchantSubscriptionView />
      </MerchantCapabilityGuard>
    </>
  );
}
