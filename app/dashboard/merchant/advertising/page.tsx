import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import {
  MerchantCapabilityGuard,
  MerchantAdvertisingView,
} from "@/features/dashboard/modules/merchant-workspace";

export const metadata: Metadata = { title: "Advertising" };

export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow="My business"
        title="Advertising"
        description="Promote your listings across Otithee at published rates."
      />
      <MerchantCapabilityGuard capability="advertising.manage">
        <MerchantAdvertisingView />
      </MerchantCapabilityGuard>
    </>
  );
}
