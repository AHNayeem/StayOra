import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { CacheList } from "@/features/dashboard/modules/cache";

export const metadata: Metadata = { title: "Cache" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["system:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Cache"
        description="Cache stores — hit rate, memory and per-store flush."
      />
      <CacheList />
    </PermissionGuard>
  );
}
