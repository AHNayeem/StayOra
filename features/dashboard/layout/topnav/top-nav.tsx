"use client";

import Link from "next/link";
import { CircleHelp, DollarSign, Globe, Menu } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { useBreadcrumbs } from "../../navigation/use-breadcrumbs";
import { useRbac } from "../../rbac/rbac-provider";
import { useShell } from "../shell-context";
import { MessagesMenu } from "./messages-menu";
import { NotificationsMenu } from "./notifications-menu";
import { OptionSwitcher } from "./option-switcher";
import { ProfileMenu } from "./profile-menu";
import { QuickActions } from "./quick-actions";
import {
  CURRENCIES,
  LANGUAGES,
  MERCHANTS,
  ORGANIZATIONS,
} from "./switcher-data";
import { ThemeToggle } from "./theme-toggle";
import { TopSearch } from "./top-search";

/**
 * Dashboard top navigation. Assembles every configurable utility from the
 * design brief — search, quick actions, language, currency, theme,
 * notifications, messages, org/merchant switchers, help and profile — with
 * feature-flag gating. The breadcrumb (derived from the route + menu) sits on
 * the left beside the mobile menu trigger.
 */
export function TopNav() {
  const { setMobileOpen } = useShell();
  const { hasFeature } = useRbac();
  const breadcrumbs = useBreadcrumbs();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line bg-surface/95 px-3 backdrop-blur sm:px-4">
      {/* Left: mobile menu + breadcrumb */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        className="grid size-10 place-items-center rounded-field text-body transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:hidden"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      <Breadcrumb items={breadcrumbs} className="hidden min-w-0 md:block" />

      {/* Right cluster */}
      <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
        <TopSearch />
        <QuickActions />

        <span className="mx-1 hidden h-6 w-px bg-line lg:block" aria-hidden="true" />

        <div className="hidden items-center gap-0.5 lg:flex">
          <OptionSwitcher
            label="Language"
            options={LANGUAGES}
            compact
            icon={<Globe className="size-4" aria-hidden="true" />}
          />
          <OptionSwitcher
            label="Currency"
            options={CURRENCIES}
            compact
            icon={<DollarSign className="size-4" aria-hidden="true" />}
          />
        </div>

        <ThemeToggle />
        <NotificationsMenu unreadCount={0} />
        {hasFeature("messages") && <MessagesMenu unreadCount={0} />}

        <span className="mx-1 hidden h-6 w-px bg-line lg:block" aria-hidden="true" />

        <div className="hidden items-center gap-1 xl:flex">
          {hasFeature("org-switcher") && (
            <OptionSwitcher label="Organization" options={ORGANIZATIONS} />
          )}
          {hasFeature("merchant-switcher") && (
            <OptionSwitcher label="Merchant" options={MERCHANTS} />
          )}
        </div>

        <Link
          href="/dashboard/support"
          aria-label="Help"
          title="Help"
          className="hidden size-10 place-items-center rounded-field text-body transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:grid"
        >
          <CircleHelp className="size-5" aria-hidden="true" />
        </Link>

        <ProfileMenu />
      </div>
    </header>
  );
}
