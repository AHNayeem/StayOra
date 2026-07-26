import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { InvoicesList } from "@/features/dashboard/modules/invoices";

export const metadata: Metadata = { title: "Invoices" };

export default function Page() {
  return (
    <PermissionGuard anyPermission={["finance:read"]} fallback={<PermissionDenied />}>
      <PageHeader title="Invoices" description="Merchant invoices and billing." />
      <InvoicesList />
    </PermissionGuard>
  );
}
