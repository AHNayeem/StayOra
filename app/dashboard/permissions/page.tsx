import type { Metadata } from "next";
import { PlaceholderPage } from "@/features/dashboard/components/placeholder-page";

export const metadata: Metadata = { title: "Permissions" };

export default function Page() {
  return (
    <PlaceholderPage
      title="Permissions"
      description="Fine-grained permission catalogue and mapping."
      phase={4}
      anyPermission={["permissions:read"]}
      features={["Permission catalogue", "Menu / route / field scopes", "API permissions", ]}
    />
  );
}
