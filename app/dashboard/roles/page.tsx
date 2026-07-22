import type { Metadata } from "next";
import { PlaceholderPage } from "@/features/dashboard/components/placeholder-page";

export const metadata: Metadata = { title: "Roles" };

export default function Page() {
  return (
    <PlaceholderPage
      title="Roles"
      description="Define roles and their permission sets."
      phase={4}
      anyPermission={["roles:read"]}
      features={["Role editor", "Permission matrix", "Assignment", "Cloning", ]}
    />
  );
}
