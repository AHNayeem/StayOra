import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { LoginLogsList } from "@/features/dashboard/modules/login-logs";

export const metadata: Metadata = { title: "Login Logs" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["logs:read"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Login Logs"
        description="Sign-in attempts across the platform — successes, failures and blocks."
      />
      <LoginLogsList />
    </PermissionGuard>
  );
}
