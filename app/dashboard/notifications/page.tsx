import type { Metadata } from "next";
import { PlaceholderPage } from "@/features/dashboard/components/placeholder-page";

export const metadata: Metadata = { title: "Notifications" };

export default function Page() {
  return (
    <PlaceholderPage
      title="Notifications"
      description="Notification centre and delivery preferences."
      phase={5}
      anyPermission={["notifications:read"]}
      features={["Unread & grouped", "Filters", "Mark read / archive", "Realtime", ]}
    />
  );
}
