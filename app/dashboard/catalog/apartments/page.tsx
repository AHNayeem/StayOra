import type { Metadata } from "next";
import { PlaceholderPage } from "@/features/dashboard/components/placeholder-page";

export const metadata: Metadata = { title: "Apartments" };

export default function Page() {
  return (
    <PlaceholderPage
      title="Apartments"
      description="Apartment inventory and listings."
      phase={4}
      anyPermission={["catalog:read"]}
      features={["Data table", "Create & edit", "Availability", "Pricing & rules", ]}
    />
  );
}
