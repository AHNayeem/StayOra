"use client";

import { useCallback, useState } from "react";
import { LogIn, Menu, UserPlus } from "lucide-react";
import { useAuth } from "@/features/auth";
import { SearchTrigger } from "@/features/search/global";
import { Container } from "@/components/ui/container";
import { useHideOnScrollDown, useScrolledPast } from "@/hooks/use-scroll-position";
import { cn } from "@/lib/utils";
import { AuthModal } from "./auth-modal";
import { DesktopNav } from "./desktop-nav";
import { LanguageSwitcher } from "./locale-switcher";
import { Logo } from "./logo";
import { MobileDrawer } from "./mobile-drawer";
import { TopBar } from "./top-bar";
import { UserMenu } from "./user-menu";

type AuthMode = "signin" | "signup";

/**
 * SiteHeader — the sticky application chrome. Orchestrates the top utility bar,
 * primary navigation, auth actions, the mobile drawer, and the auth modal, and
 * elevates itself once the page is scrolled. Rendered once in the root layout.
 */
export function SiteHeader() {
  const scrolled = useScrolledPast(8);
  const topBarHidden = useHideOnScrollDown(44);
  const { status, user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");

  const openAuth = useCallback((mode: AuthMode) => {
    setDrawerOpen(false);
    setAuthMode(mode);
    setAuthOpen(true);
  }, []);

  return (
    <header className="sticky top-0 z-50">
      <div
        className={cn(
          "overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out",
          topBarHidden ? "max-h-0 opacity-0" : "max-h-11 opacity-100",
        )}
      >
        <TopBar />
      </div>

      <div
        className={cn(
          "bg-surface transition-shadow duration-300",
          scrolled ? "shadow-card" : "border-b border-line",
        )}
      >
        <Container className="flex h-16 items-center justify-between gap-4">
          <Logo />

          <DesktopNav />

          <div className="flex items-center gap-2">
            <SearchTrigger />

            <LanguageSwitcher className="hidden text-ink md:block lg:hidden" />

            {status === "loading" ? (
              // Reserve space until the persisted session is read, to avoid a
              // flash of the sign-in buttons before the avatar appears.
              <span
                aria-hidden="true"
                className="hidden size-9 animate-pulse rounded-full bg-surface-muted sm:block"
              />
            ) : status === "authenticated" && user ? (
              <UserMenu user={user} />
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => openAuth("signin")}
                  className="hidden items-center gap-2 rounded-pill px-4 py-2 text-sm font-medium text-ink transition-colors hover:text-primary sm:inline-flex"
                >
                  <LogIn className="size-4" aria-hidden="true" />
                  Sign In
                </button>

                <button
                  type="button"
                  onClick={() => openAuth("signup")}
                  className="hidden items-center gap-2 rounded-pill bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600 sm:inline-flex"
                >
                  <UserPlus className="size-4" aria-hidden="true" />
                  Sign Up
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              className="grid size-10 place-items-center rounded-field text-ink transition-colors hover:bg-primary-50 hover:text-primary lg:hidden"
            >
              <Menu className="size-6" aria-hidden="true" />
            </button>
          </div>
        </Container>
      </div>

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSignIn={() => openAuth("signin")}
      />

      {authOpen && (
        <AuthModal
          onClose={() => setAuthOpen(false)}
          initialMode={authMode}
        />
      )}
    </header>
  );
}
