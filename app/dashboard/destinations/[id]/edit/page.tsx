import type { Metadata } from "next";
import { PageHeader } from "@/features/dashboard/components/page-header";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import { PermissionDenied } from "@/features/dashboard/components/state-views";
import { DestinationEditor } from "@/features/dashboard/modules/destinations";

/** Dynamic params for the destination edit route (a Promise in the App Router). */
type Params = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Edit Destination" };

export default async function Page({ params }: Params) {
  const { id } = await params;
  return (
    <PermissionGuard anyPermission={["cms:update"]} fallback={<PermissionDenied />}>
      <PageHeader
        title="Edit destination"
        description="Changes appear on the public destination page as soon as you save."
      />
      <DestinationEditor id={id} />
    </PermissionGuard>
  );
}
