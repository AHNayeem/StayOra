import type { Metadata } from "next";
import { NotificationsView } from "./notifications-view";

export const metadata: Metadata = { title: "Notifications" };

/**
 * The in-app inbox plus channel preferences. Messages are the same records the
 * admin delivery log shows, produced by the same templates.
 */
export default function NotificationsPage() {
  return <NotificationsView />;
}
