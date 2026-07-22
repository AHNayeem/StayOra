import type { Metadata } from "next";
import { PlaceholderPage } from "@/features/dashboard/components/placeholder-page";

export const metadata: Metadata = { title: "Create Promotion" };

export default function Page() {
  return (
    <PlaceholderPage
      title="Create Promotion"
      description="Set up a new coupon, offer or campaign."
      phase={4}
      anyPermission={["promotions:create"]}
      features={["Rule builder", "Scheduling", "Targeting", ]}
    />
  );
}
