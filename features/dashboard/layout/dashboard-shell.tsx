"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ImpersonationBanner } from "../auth/impersonation-banner";
import { SessionProvider } from "../auth/session-provider";
import type { Session } from "../auth/types";
import { CommandPalette } from "../command-palette/command-palette";
import { QueryProvider } from "../data/query";
import {
  FeatureFlagsProvider,
  useFeatureFlag,
} from "../feature-flags/feature-flags-provider";
import type { FeatureFlagKey } from "../feature-flags/flags";
import { useSchedulerTick } from "../domain/use-scheduler-tick";
import { RbacProvider } from "../rbac/rbac-provider";
import { RouteGuard } from "../rbac/route-guard";
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
  // Scheduled jobs run while an operator has the dashboard open — message
  // delivery, hold expiry, recovery nudges. See `domain/scheduler.ts`.
  useSchedulerTick();
  // The palette is flag-gated: switching it off has to remove the surface, not
  // just its launcher, or ⌘K would still open it.
  const paletteEnabled = useFeatureFlag("command-palette");

  return (
    <div
      className={cn(
        "min-h-screen bg-surface text-ink",
        resolved === "dark" && "dark",
      )}
    >
      {/* Past the rail and the top nav — the dashboard's sidebar is long, and
          tabbing through it on every navigation is the main keyboard cost. */}
      <a
        href="#dashboard-content"
        className="sr-only rounded-field bg-primary px-4 py-2 font-medium text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100"
      >
        Skip to content
      </a>

      {/* Above the rail and the top nav: an impersonated session must announce
          itself before anything else on the page does. */}
      <ImpersonationBanner />

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
            tabIndex={-1}
            className="flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8"
          >
            <div className="mx-auto w-full max-w-[1600px]">
              {/* Route-level RBAC: typing a URL is not a way around access. */}
              <RouteGuard>{children}</RouteGuard>
            </div>
          </main>
        </div>
      </div>

      {commandOpen && paletteEnabled && <CommandPalette />}
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
