import type { Metadata } from "next";
import { PlaceholderPage } from "@/features/dashboard/components/placeholder-page";

export const metadata: Metadata = { title: "Reports" };

export default function Page() {
  return (
    <PlaceholderPage
      title="Reports"
      description="Build, filter and export dynamic reports."
      phase={5}
      anyPermission={["reports:read"]}
      features={["Report builder", "Filters", "CSV / Excel / PDF", "Scheduling", ]}
    />
  );
}
