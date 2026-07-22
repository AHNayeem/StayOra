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
  UserPlus,
  X,
} from "lucide-react";
import { PRIMARY_NAV } from "@/constants/navigation";
import { siteConfig } from "@/constants/site";
import { useAuth } from "@/features/auth";
import { SearchDialog } from "@/features/search/global";
import { Avatar } from "@/components/ui/avatar";
import { SocialIcon } from "@/components/shared/social-icons";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  onSignIn: () => void;
}

/**
 * MobileDrawer — off-canvas navigation for small screens. Mirrors the primary
 * nav, expands mega-menu groups as accordions, and closes on route change,
 * Escape, or overlay tap. Body scroll is locked while open.
 */
export function MobileDrawer({ open, onClose, onSignIn }: MobileDrawerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { status, user, canAccessDashboard, logout } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  useLockBodyScroll(open);

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

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
    <div
      className={cn(
        "fixed inset-0 z-60 lg:hidden",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!open}
    >
      {/* Overlay */}
      <div
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-ink/50 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        className={cn(
          "absolute right-0 top-0 flex h-full w-[86%] max-w-sm flex-col bg-surface shadow-menu transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
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

        <div className="px-4 pt-4">
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
        </div>

        <nav
          aria-label="Mobile"
          className="flex-1 overflow-y-auto px-2 py-3"
        >
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
                    {item.label}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </nav>

        <div className="border-t border-line px-5 py-4">
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
                Sign In
              </button>
              <button
                type="button"
                onClick={onSignIn}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-pill bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600"
              >
                <UserPlus className="size-4" aria-hidden="true" />
                Sign Up
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

  return (
    <li>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between rounded-field px-4 py-3 font-medium text-ink transition-colors hover:bg-primary-50 hover:text-primary"
      >
        {item.label}
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
                {col.heading}
              </p>
              <ul>
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="block rounded-field px-4 py-2 text-sm text-body transition-colors hover:bg-primary-50 hover:text-primary"
                    >
                      {link.label}
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
