"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ChevronDown,
  LayoutDashboard,
  LayoutGrid,
  LogIn,
  LogOut,
  Search,
  Sparkles,
  UserPlus,
  X,
} from "lucide-react";
import { PRIMARY_NAV } from "@/constants/navigation";
import { TripCartButton } from "@/features/trip";
import { siteConfig } from "@/constants/site";
import { useOptionalAssistant } from "@/features/ai";
import { useAuth } from "@/features/auth";
import { useT } from "@/features/i18n";
import { SearchDialog } from "@/features/search/global";
import { Avatar } from "@/components/ui/avatar";
import { SocialIcon } from "@/components/shared/social-icons";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { useIsDesktopNav } from "@/hooks/use-media-query";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  onSignIn: () => void;
}

/**
 * MobileDrawer — off-canvas navigation for every width below `xl`, where
 * SiteHeader hides {@link DesktopNav} behind its hamburger. Mirrors the primary
 * nav, expands mega-menu groups as accordions, and closes on route change,
 * Escape, or overlay tap. Body scroll is locked while it is actually on screen.
 */
export function MobileDrawer({ open, onClose, onSignIn }: MobileDrawerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { status, user, canAccessDashboard, logout } = useAuth();
  const assistant = useOptionalAssistant();
  const [searchOpen, setSearchOpen] = useState(false);
  const t = useT();
  const isDesktopNav = useIsDesktopNav();

  // The panel is `xl:hidden`, so above that breakpoint "open" paints nothing —
  // locking scroll there would freeze the page with no visible overlay.
  const visible = open && !isDesktopNav;
  useLockBodyScroll(visible);

  const handleLogout = async () => {
    onClose();
    await logout();
    toast.success("Signed out. See you soon!");
    router.push("/");
  };

  // Close whenever the route changes (a nav link was followed).
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Widening past `xl` brings the desktop nav back, so drop the drawer state
  // instead of leaving it primed to reappear on the next resize down.
  useEffect(() => {
    if (open && isDesktopNav) onClose();
  }, [open, isDesktopNav, onClose]);

  // Close on Escape.
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, onClose]);

  return (
    <>
    <div
      // `xl:hidden` must match the hamburger's `xl:hidden` in SiteHeader — see
      // useIsDesktopNav. It used to be `lg:hidden`, which left 1024–1279px with
      // a visible trigger opening a `display: none` panel.
      className={cn(
        "fixed inset-0 z-60 xl:hidden",
        visible ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!visible}
      // The panel stays mounted so it can slide, so take its links out of the
      // tab order while it is off-canvas.
      inert={!visible}
    >
      {/* Overlay */}
      <div
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-ink/50 transition-opacity duration-300",
          visible ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        className={cn(
          "absolute right-0 top-0 flex h-full w-[86%] max-w-sm flex-col bg-surface shadow-menu transition-transform duration-300 ease-out",
          visible ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4">
          <Logo />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="grid size-9 place-items-center rounded-field text-ink transition-colors hover:bg-primary-50 hover:text-primary"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="shrink-0 px-4 pt-4">
          <button
            type="button"
            onClick={() => {
              onClose();
              setSearchOpen(true);
            }}
            className="flex w-full items-center gap-2.5 rounded-pill border border-line bg-surface-muted/60 px-4 py-3 text-sm text-muted transition-colors hover:border-primary/40 hover:text-ink"
          >
            <Search className="size-4" aria-hidden="true" />
            Search stays, tours, destinations…
          </button>

          {assistant && (
            <button
              type="button"
              onClick={() => {
                onClose();
                assistant.openAssistant();
              }}
              className="mt-2 flex w-full items-center gap-2.5 rounded-pill bg-primary-50 px-4 py-3 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-100"
            >
              <Sparkles className="size-4" aria-hidden="true" />
              {t("Ask Otithee AI")}
            </button>
          )}
        </div>

        {/* min-h-0 lets this actually clip inside the column flex; overscroll-contain
            keeps a touch flick at either end from scrolling the page behind. */}
        <nav
          aria-label="Mobile"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3"
        >
          {/* Renders only while a trip is in progress, so the drawer doesn't
              grow a permanent basket entry for single-product bookers. */}
          <TripCartButton showLabel className="mx-2 mb-2 flex w-[calc(100%-1rem)] justify-center" />
          <ul className="space-y-0.5">
            {PRIMARY_NAV.map((item) =>
              item.megaMenu ? (
                <DrawerAccordion key={item.label} item={item} />
              ) : (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="block rounded-field px-4 py-3 font-medium text-ink transition-colors hover:bg-primary-50 hover:text-primary"
                  >
                    {t(item.label)}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </nav>

        <div className="shrink-0 border-t border-line px-5 py-4">
          {status === "authenticated" && user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar src={user.avatar} name={user.name} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">
                    {user.name}
                  </p>
                  <p className="truncate text-xs text-muted">{user.email}</p>
                </div>
              </div>
              <Link
                href="/account"
                className="inline-flex w-full items-center justify-center gap-2 rounded-pill border border-line px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-primary hover:text-primary"
              >
                <LayoutGrid className="size-4" aria-hidden="true" />
                My account
              </Link>
              {canAccessDashboard && (
                <Link
                  href="/dashboard"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-pill border border-line px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-primary hover:text-primary"
                >
                  <LayoutDashboard className="size-4" aria-hidden="true" />
                  Dashboard
                </Link>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex w-full items-center justify-center gap-2 rounded-pill bg-surface-muted px-4 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
              >
                <LogOut className="size-4" aria-hidden="true" />
                Sign out
              </button>
            </div>
          ) : status === "loading" ? (
            <div
              aria-hidden="true"
              className="h-11 animate-pulse rounded-pill bg-surface-muted"
            />
          ) : (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onSignIn}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-pill border border-line px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-primary hover:text-primary"
              >
                <LogIn className="size-4" aria-hidden="true" />
                {t("Sign In")}
              </button>
              <button
                type="button"
                onClick={onSignIn}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-pill bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600"
              >
                <UserPlus className="size-4" aria-hidden="true" />
                {t("Sign Up")}
              </button>
            </div>
          )}

          <ul className="mt-4 flex items-center justify-center gap-4">
            {siteConfig.social.map((s) => (
              <li key={s.label}>
                <Link
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="text-muted transition-colors hover:text-primary"
                >
                  <SocialIcon name={s.icon} className="size-5" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>

    {searchOpen && <SearchDialog onClose={() => setSearchOpen(false)} />}
    </>
  );
}

function DrawerAccordion({
  item,
}: {
  item: (typeof PRIMARY_NAV)[number];
}) {
  const [expanded, setExpanded] = useState(false);
  const t = useT();

  return (
    <li>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between rounded-field px-4 py-3 font-medium text-ink transition-colors hover:bg-primary-50 hover:text-primary"
      >
        {t(item.label)}
        <ChevronDown
          className={cn(
            "size-4 transition-transform",
            expanded && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>
      {expanded && item.megaMenu && (
        <div className="space-y-3 pb-2 pl-4 pt-1">
          {item.megaMenu.map((col) => (
            <div key={col.heading}>
              <p className="text-overline px-4 py-1 text-primary">
                {t(col.heading)}
              </p>
              <ul>
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="block rounded-field px-4 py-2 text-sm text-body transition-colors hover:bg-primary-50 hover:text-primary"
                    >
                      {t(link.label)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </li>
  );
}
