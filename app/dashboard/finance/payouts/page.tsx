import type { Metadata } from "next";
import { PlaceholderPage } from "@/features/dashboard/components/placeholder-page";

export const metadata: Metadata = { title: "Payouts" };

export default function Page() {
  return (
    <PlaceholderPage
      title="Payouts"
      description="Merchant payouts and settlements."
      phase={4}
      anyPermission={["finance:read"]}
      features={["Data table", "Filters", "Export", "Detail view", ]}
    />
  );
}
