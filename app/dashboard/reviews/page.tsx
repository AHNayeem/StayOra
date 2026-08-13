import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { ReviewModeration } from "@/features/dashboard/modules/reviews";

export const metadata: Metadata = { title: "Reviews" };

/**
 * Review moderation. Every review here is tied to a completed booking, so
 * approving one publishes a verified stay on the listing page immediately.
 */
export default function Page() {
  return (
    <PermissionGuard anyPermission={["reviews:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Reviews"
        description="Moderate verified-stay reviews, reply as the property and handle reports."
      />
      <ReviewModeration />
    </PermissionGuard>
  );
}
