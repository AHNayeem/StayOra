"use client";

import { useCallback, useState } from "react";
import { LogIn, Menu, Sparkles, UserPlus } from "lucide-react";
import { useOptionalAssistant } from "@/features/ai";
import { useAuth } from "@/features/auth";
import { useT } from "@/features/i18n";
import { SearchTrigger } from "@/features/search/global";
import { TripCartButton } from "@/features/trip";
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
  const assistant = useOptionalAssistant();
  const t = useT();
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
          "transition-[max-height,opacity] duration-300 ease-in-out",
          topBarHidden
            ? "max-h-0 overflow-hidden opacity-0"
            : "max-h-11 overflow-visible opacity-100",
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
        <Container className="flex h-16 items-center justify-between gap-3 xl:gap-4">
          <Logo preload />

          <DesktopNav />

          {/* min-w-0 so overflow pressure lands on the truncatable user name
              instead of wrapping the nav or squeezing the logo. */}
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <SearchTrigger />

            {/* Only rendered once a trip has something in it — see TripCartButton. */}
            <TripCartButton className="hidden sm:inline-flex" />

            {/* {assistant && (
              <button
                type="button"
                onClick={() => assistant.openAssistant()}
                aria-label={t("Ask Otithee AI")}
                title={t("Ask Otithee AI")}
                className="hidden items-center gap-1.5 rounded-pill border border-line px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-primary hover:text-primary sm:inline-flex"
              >
                <Sparkles className="size-4" aria-hidden="true" />
                <span className="hidden lg:inline">{t("Ask AI")}</span>
              </button>
            )} */}

            <LanguageSwitcher className="hidden text-ink md:block xl:hidden" />

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
                {/* <button
                  type="button"
                  onClick={() => openAuth("signin")}
                  className="hidden items-center gap-2 rounded-pill px-4 py-2 text-sm font-medium text-ink transition-colors hover:text-primary sm:inline-flex"
                >
                  <LogIn className="size-4" aria-hidden="true" />
                  {t("Sign In")}
                </button> */}

                {/* <button
                  type="button"
                  onClick={() => openAuth("signup")}
                  className="hidden items-center gap-2 rounded-pill bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600 sm:inline-flex"
                >
                  <UserPlus className="size-4" aria-hidden="true" />
                  {t("Sign Up")}
                </button> */}
                <button
                  type="button"
                  onClick={() => openAuth("signin")}
                  className="hidden items-center gap-2 rounded-pill bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600 sm:inline-flex"
                >
                  <UserPlus className="size-4" aria-hidden="true" />
                  {t("Sign In")}
                </button>
              </>
            )}

            {/* Visible exactly where DesktopNav is not (`xl`). MobileDrawer must
                use the same breakpoint, or this opens a hidden panel. */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label={t("Open menu")}
              aria-expanded={drawerOpen}
              aria-haspopup="dialog"
              className="grid size-10 shrink-0 place-items-center rounded-field text-ink transition-colors hover:bg-primary-50 hover:text-primary xl:hidden"
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
