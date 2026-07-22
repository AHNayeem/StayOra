"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SessionProvider } from "../auth/session-provider";
import type { Session } from "../auth/types";
import { CommandPalette } from "../command-palette/command-palette";
import { QueryProvider } from "../data/query";
import { FeatureFlagsProvider } from "../feature-flags/feature-flags-provider";
import type { FeatureFlagKey } from "../feature-flags/flags";
import { RbacProvider } from "../rbac/rbac-provider";
import { ThemeProvider, useTheme } from "../theme/theme-provider";
import { ShellProvider, useShell } from "./shell-context";
import { MobileSidebar } from "./sidebar/mobile-sidebar";
import { SidebarContent } from "./sidebar/sidebar";
import { TopNav } from "./topnav/top-nav";

/**
 * The frame rendered inside all providers. Owns the responsive grid: a
 * collapsible desktop rail, an off-canvas mobile drawer, the sticky top nav and
 * the scrollable content column. Applies the `dark` class here so theming is
 * scoped to the dashboard.
 */
function ShellFrame({ children }: { children: ReactNode }) {
  const { resolved } = useTheme();
  const { collapsed, commandOpen } = useShell();

  return (
    <div
      className={cn(
        "min-h-screen bg-surface text-ink",
        resolved === "dark" && "dark",
      )}
    >
      <div className="flex min-h-screen">
        {/* Desktop rail */}
        <aside
          className={cn(
            "sticky top-0 hidden h-screen shrink-0 border-r border-line transition-[width] duration-200 lg:block",
            collapsed ? "w-[4.5rem]" : "w-64",
          )}
        >
          <SidebarContent />
        </aside>

        {/* Mobile drawer */}
        <MobileSidebar />

        {/* Content column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <TopNav />
          <main
            id="dashboard-content"
            className="flex-1 px-4 py-6 sm:px-6 lg:px-8"
          >
            <div className="mx-auto w-full max-w-[1600px]">{children}</div>
          </main>
        </div>
      </div>

      {commandOpen && <CommandPalette />}
    </div>
  );
}

interface DashboardShellProps {
  session: Session;
  featureFlags: FeatureFlagKey[];
  children: ReactNode;
}

/**
 * Top-level dashboard shell. Composes the data + access + presentation providers
 * around the responsive frame. Rendered once by the dashboard route layout; the
 * `session` and `featureFlags` are resolved on the server and injected here.
 *
 * Provider order (outermost → innermost):
 *   Session   — who is signed in; teaches the HTTP client its token
 *   Query     — client cache for useQuery / useMutation
 *   Rbac      — permission checks derived from the session user
 *   Feature   — module-level flag gating
 *   Theme / Shell — presentation state
 */
export function DashboardShell({
  session,
  featureFlags,
  children,
}: DashboardShellProps) {
  return (
    <SessionProvider session={session}>
      <QueryProvider>
        <RbacProvider user={session.user}>
          <FeatureFlagsProvider flags={featureFlags}>
            <ThemeProvider>
              <ShellProvider>
                <ShellFrame>{children}</ShellFrame>
              </ShellProvider>
            </ThemeProvider>
          </FeatureFlagsProvider>
        </RbacProvider>
      </QueryProvider>
    </SessionProvider>
  );
}
