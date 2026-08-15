import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import {
  MerchantCapabilityGuard,
  MerchantStaffView,
} from "@/features/dashboard/modules/merchant-workspace";

export const metadata: Metadata = { title: "Staff & roles" };

export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow="My business"
        title="Staff & roles"
        description="Invite your team and give each person only the access their job needs."
      />
      <MerchantCapabilityGuard capability="staff.manage">
        <MerchantStaffView />
      </MerchantCapabilityGuard>
    </>
  );
}
