import type { Metadata } from "next";
import { PlaceholderPage } from "@/features/dashboard/components/placeholder-page";

export const metadata: Metadata = { title: "Refunds" };

export default function Page() {
  return (
    <PlaceholderPage
      title="Refunds"
      description="Refund processing and status."
      phase={4}
      anyPermission={["finance:read"]}
      features={["Data table", "Filters", "Export", "Detail view", ]}
    />
  );
}
