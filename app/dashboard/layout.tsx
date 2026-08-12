import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "@/features/dashboard/auth/session";
import { getFeatureFlags } from "@/features/dashboard/feature-flags/flags";
import { DashboardShell } from "@/features/dashboard/layout/dashboard-shell";

export const metadata: Metadata = {
  title: {
    default: "Dashboard",
    template: "%s | Otithee Dashboard",
  },
  robots: { index: false, follow: false },
};

/**
 * Dashboard route group layout.
 *
 * Resolves the authenticated session on the server and bounces anyone without a
 * dashboard-capable session to sign-in *before* any privileged chrome renders —
 * so a signed-out visitor, or a traveler who has no dashboard role, never sees
 * the shell at all. Feature flags are resolved per tenant here too, and both are
 * handed to the client shell, which owns data, navigation, theming and access
 * control (including per-route permission enforcement) for the subtree.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (!session) redirect("/login?next=/dashboard");

  const featureFlags = await getFeatureFlags(session.user.featureFlags);

  return (
    <DashboardShell session={session} featureFlags={featureFlags}>
      {children}
    </DashboardShell>
  );
}
