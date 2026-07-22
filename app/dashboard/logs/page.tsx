import type { Metadata } from "next";
import { PlaceholderPage } from "@/features/dashboard/components/placeholder-page";

export const metadata: Metadata = { title: "Audit Logs" };

export default function Page() {
  return (
    <PlaceholderPage
      title="Audit Logs"
      description="Audit, login and API activity logs."
      phase={5}
      anyPermission={["logs:read"]}
      features={["Audit trail", "Login logs", "API logs", "Filters & export", ]}
    />
  );
}
