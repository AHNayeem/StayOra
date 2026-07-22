import type { Metadata } from "next";
import { getServerSession } from "@/features/dashboard/auth/session";
import { getFeatureFlags } from "@/features/dashboard/feature-flags/flags";
import { DashboardShell } from "@/features/dashboard/layout/dashboard-shell";

export const metadata: Metadata = {
  title: {
    default: "Dashboard",
    template: "%s | StayOra Dashboard",
  },
  robots: { index: false, follow: false },
};

/**
 * Dashboard route group layout. Resolves the authenticated session and the
 * tenant's feature flags on the server (Phase 3 stubs → session/config lookups
 * later) and hands them to the client shell, which owns data, navigation,
 * theming and access control for the subtree.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  const featureFlags = await getFeatureFlags(session.user.featureFlags);

  return (
    <DashboardShell session={session} featureFlags={featureFlags}>
      {children}
    </DashboardShell>
  );
}
