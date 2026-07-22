import type { Metadata } from "next";
import { PlaceholderPage } from "@/features/dashboard/components/placeholder-page";

export const metadata: Metadata = { title: "Users" };

export default function Page() {
  return (
    <PlaceholderPage
      title="Users"
      description="Platform user directory and access management."
      phase={4}
      anyPermission={["users:read"]}
      features={["User table", "Invite & deactivate", "Role assignment", "Sessions", ]}
    />
  );
}
