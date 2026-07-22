import type { Metadata } from "next";
import { PlaceholderPage } from "@/features/dashboard/components/placeholder-page";

export const metadata: Metadata = { title: "Invoices" };

export default function Page() {
  return (
    <PlaceholderPage
      title="Invoices"
      description="Invoice generation and history."
      phase={4}
      anyPermission={["finance:read"]}
      features={["Data table", "Filters", "Export", "Detail view", ]}
    />
  );
}
