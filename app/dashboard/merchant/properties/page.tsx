import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import {
  MerchantCapabilityGuard,
  MerchantPropertiesView,
} from "@/features/dashboard/modules/merchant-workspace";

export const metadata: Metadata = { title: "Properties" };

export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow="My business"
        title="Properties"
        description="The supply entities you operate, and their channel manager connections."
      />
      <MerchantCapabilityGuard capability="catalogue.manage">
        <MerchantPropertiesView />
      </MerchantCapabilityGuard>
    </>
  );
}
