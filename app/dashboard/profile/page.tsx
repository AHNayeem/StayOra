import type { Metadata } from "next";
import { PlaceholderPage } from "@/features/dashboard/components/placeholder-page";

export const metadata: Metadata = { title: "Profile" };

export default function Page() {
  return (
    <PlaceholderPage
      title="Profile"
      description="Your account details, security and preferences."
      phase={3}
      anyPermission={["profile:read"]}
      features={["Profile details", "Password & 2FA", "Sessions", "Preferences", ]}
    />
  );
}
