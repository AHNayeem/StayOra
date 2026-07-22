import type { Metadata } from "next";
import { PlaceholderPage } from "@/features/dashboard/components/placeholder-page";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return (
    <PlaceholderPage
      title="Settings"
      description="Platform, notification and integration settings."
      phase={4}
      anyPermission={["settings:read"]}
      features={["General settings", "Feature flags", "Email / SMS templates", "Integrations", ]}
    />
  );
}
