import type { Metadata } from "next";
import { PlaceholderPage } from "@/features/dashboard/components/placeholder-page";

export const metadata: Metadata = { title: "Resorts" };

export default function Page() {
  return (
    <PlaceholderPage
      title="Resorts"
      description="Resort inventory and listings."
      phase={4}
      anyPermission={["catalog:read"]}
      features={["Data table", "Create & edit", "Availability", "Pricing & rules", ]}
    />
  );
}
