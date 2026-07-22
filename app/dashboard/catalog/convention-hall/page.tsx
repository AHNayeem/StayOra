import type { Metadata } from "next";
import { PlaceholderPage } from "@/features/dashboard/components/placeholder-page";

export const metadata: Metadata = { title: "Convention Hall" };

export default function Page() {
  return (
    <PlaceholderPage
      title="Convention Hall"
      description="Convention hall inventory."
      phase={4}
      anyPermission={["catalog:read"]}
      features={["Data table", "Create & edit", "Availability", "Pricing & rules", ]}
    />
  );
}
