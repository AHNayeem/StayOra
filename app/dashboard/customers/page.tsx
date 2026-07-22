import type { Metadata } from "next";
import { PlaceholderPage } from "@/features/dashboard/components/placeholder-page";

export const metadata: Metadata = { title: "Customers" };

export default function Page() {
  return (
    <PlaceholderPage
      title="Customers"
      description="Customer directory, profiles and booking history."
      phase={4}
      anyPermission={["customers:read"]}
      features={["Directory table", "Profile view", "Booking history", "Notes", ]}
    />
  );
}
