import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { TestimonialList } from "@/features/dashboard/modules/testimonials";

export const metadata: Metadata = { title: "Testimonials" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["cms:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Testimonials"
        description="Customer quotes shown across the storefront — review, publish and curate."
      />
      <TestimonialList />
    </PermissionGuard>
  );
}
