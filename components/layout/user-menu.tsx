"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  CalendarCheck,
  ChevronDown,
  Heart,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  UserRound,
} from "lucide-react";
import type { AuthUser } from "@/types/account";
import { useAuth } from "@/features/auth";
import { Avatar } from "@/components/ui/avatar";
import { useClickOutside } from "@/hooks/use-click-outside";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

/**
 * UserMenu — the authenticated header control: an avatar trigger with a
 * dropdown of account shortcuts and sign-out. Links into the traveler account
 * area (/account), plus the merchant/admin dashboard for privileged roles.
 */
export function UserMenu({ user }: { user: AuthUser }) {
  const { logout, canAccessDashboard } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, () => setOpen(false), open);

  const firstName = user.name.split(" ")[0];

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    toast.success("Signed out. See you soon!");
    router.push("/");
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-pill py-1 pl-1 pr-2 transition-colors hover:bg-surface-muted"
      >
        <Avatar src={user.avatar} name={user.name} size="sm" />
        <span className="hidden max-w-28 truncate text-sm font-medium text-ink sm:block">
          {firstName}
        </span>
        <ChevronDown
          className={cn("size-4 text-muted transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.5rem)] w-64 overflow-hidden rounded-panel border border-line bg-surface shadow-menu"
        >
          <div className="flex items-center gap-3 border-b border-line px-4 py-3">
            <Avatar src={user.avatar} name={user.name} size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
            </div>
          </div>

          <div className="py-1.5">
            <MenuLink
              href="/account"
              icon={<LayoutGrid className="size-4" aria-hidden="true" />}
              onClick={() => setOpen(false)}
            >
              My account
            </MenuLink>
            <MenuLink
              href="/account/bookings"
              icon={<CalendarCheck className="size-4" aria-hidden="true" />}
              onClick={() => setOpen(false)}
            >
              Bookings
            </MenuLink>
            <MenuLink
              href="/account/wishlist"
              icon={<Heart className="size-4" aria-hidden="true" />}
              onClick={() => setOpen(false)}
            >
              Wishlist
            </MenuLink>
            {canAccessDashboard && (
              <MenuLink
                href="/dashboard"
                icon={<LayoutDashboard className="size-4" aria-hidden="true" />}
                onClick={() => setOpen(false)}
              >
                Dashboard
              </MenuLink>
            )}
            {!user.emailVerified && (
              <MenuLink
                href="/verify-email"
                icon={<BadgeCheck className="size-4" aria-hidden="true" />}
                onClick={() => setOpen(false)}
              >
                Verify email
              </MenuLink>
            )}
            {!user.profileComplete && (
              <MenuLink
                href="/complete-profile"
                icon={<UserRound className="size-4" aria-hidden="true" />}
                onClick={() => setOpen(false)}
              >
                Complete profile
              </MenuLink>
            )}
          </div>

          <div className="border-t border-line py-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-danger transition-colors hover:bg-danger/10"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  icon,
  onClick,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-body transition-colors hover:bg-primary-50 hover:text-primary"
    >
      {icon}
      {children}
    </Link>
  );
}
