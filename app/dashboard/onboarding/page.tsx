import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PageSkeleton } from "@/features/dashboard/components/page-skeleton";
import { MerchantOnboardingView } from "@/features/dashboard/modules/merchant-onboarding";

export const metadata: Metadata = { title: "Onboarding" };

/**
 * Merchant onboarding — registration through to submission.
 *
 * Deliberately not permission-gated beyond the dashboard session: an
 * unapproved merchant holds almost no permissions, and this is the one screen
 * they must be able to reach.
 */
export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow="Partner"
        title="Onboarding"
        description="Complete your profile, verification and payout details, then submit for review."
      />
      <Suspense fallback={<PageSkeleton />}>
        <MerchantOnboardingView />
      </Suspense>
    </>
  );
}
