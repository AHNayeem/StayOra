import type { Metadata } from "next";
import { PlaceholderPage } from "@/features/dashboard/components/placeholder-page";

export const metadata: Metadata = { title: "Support" };

export default function Page() {
  return (
    <PlaceholderPage
      title="Support"
      description="Support tickets and help resources."
      phase={4}
      anyPermission={["support:read"]}
      features={["Ticket queue", "Assignment", "SLA tracking", "Knowledge base", ]}
    />
  );
}
