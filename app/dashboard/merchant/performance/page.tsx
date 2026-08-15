import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { MerchantPerformanceView } from "@/features/dashboard/modules/merchant-workspace";

export const metadata: Metadata = { title: "Performance" };

export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow="My business"
        title="Performance & health"
        description="How your account is doing, and what moves the number."
      />
      <MerchantPerformanceView />
    </>
  );
}
