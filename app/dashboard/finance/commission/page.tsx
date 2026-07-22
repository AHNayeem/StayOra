import type { Metadata } from "next";
import { PlaceholderPage } from "@/features/dashboard/components/placeholder-page";

export const metadata: Metadata = { title: "Commission" };

export default function Page() {
  return (
    <PlaceholderPage
      title="Commission"
      description="Commission rules and reconciliation."
      phase={4}
      anyPermission={["finance:read"]}
      features={["Data table", "Filters", "Export", "Detail view", ]}
    />
  );
}
