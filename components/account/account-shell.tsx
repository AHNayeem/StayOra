"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Gift, Pencil } from "lucide-react";
import type { AuthUser, LoyaltyTier } from "@/types/account";
import { useAuth } from "@/features/auth";
import { useRequireAuth } from "@/features/auth/guards";
import { useLocale } from "@/features/i18n";
import { AuthGate } from "@/components/auth/auth-gate";
import { Avatar } from "@/components/ui/avatar";
import { Container } from "@/components/ui/container";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AccountSidebar } from "./account-sidebar";

const TIER_STYLES: Record<LoyaltyTier, string> = {
  bronze: "bg-amber-800/10 text-amber-800",
  silver: "bg-slate-400/15 text-slate-600",
  gold: "bg-warning/15 text-amber-700",
  platinum: "bg-slate-700/10 text-slate-700",
};

/**
 * AccountShell — the persistent frame for `/account/*`. Client-side guarded
 * (guests bounce to `/login?next=…`), it renders the traveler identity strip
 * and the section sidebar around the active page. Sits inside the marketing
 * layout, so it inherits the site header, footer and locale provider.
 */
export function AccountShell({ children }: { children: ReactNode }) {
  const { isResolving } = useRequireAuth();
  const { user } = useAuth();

  if (isResolving || !user) {
    return <AuthGate label="Loading your account…" />;
  }

  return (
    <Container className="py-8 md:py-10">
      <AccountHero user={user} />
      <div className="mt-8 grid gap-8 lg:grid-cols-[248px_minmax(0,1fr)] lg:items-start">
        <AccountSidebar />
        <div className="min-w-0">{children}</div>
      </div>
    </Container>
  );
}

function AccountHero({ user }: { user: AuthUser }) {
  const { date, number } = useLocale();
  return (
    <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <Avatar src={user.avatar} name={user.name} size="lg" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-semibold text-ink">{user.name}</h1>
            <span
              className={cn(
                "rounded-pill px-2.5 py-0.5 text-xs font-semibold capitalize",
                TIER_STYLES[user.loyaltyTier],
              )}
            >
              {user.loyaltyTier} member
            </span>
          </div>
          <p className="truncate text-sm text-muted">{user.email}</p>
          <p className="mt-0.5 text-xs text-muted">Member since {date(user.createdAt)}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/account/rewards"
          className="flex items-center gap-2 rounded-card bg-primary-50 px-4 py-2.5 text-primary"
        >
          <Gift className="size-5" aria-hidden="true" />
          <span className="text-sm leading-tight">
            <span className="block font-bold">{number(user.points)}</span>
            <span className="block text-xs">reward points</span>
          </span>
        </Link>
        <Link
          href="/account/profile"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Pencil className="size-4" aria-hidden="true" />
          Edit profile
        </Link>
      </div>
    </div>
  );
}
