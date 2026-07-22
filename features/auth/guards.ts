"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { AccountRole } from "@/types/account";
import { useAuth, type AuthStatus } from "./use-auth";

/**
 * Send an already-signed-in visitor away from a guest-only page (login,
 * register, forgot-password). Runs only after hydration so it never redirects
 * on the server or first paint. The effect performs navigation only — no
 * `setState` — so it's clear of the `set-state-in-effect` rule.
 */
export function useRedirectIfAuthenticated(to = "/"): AuthStatus {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace(to);
  }, [status, to, router]);

  return status;
}

export interface RequireAuthOptions {
  /** Restrict to one or more roles; others are redirected to `deniedTo`. */
  role?: AccountRole | AccountRole[];
  /** Where role-denied users land. Defaults to the site root. */
  deniedTo?: string;
}

export interface RequireAuthResult {
  status: AuthStatus;
  /** True while the guard is resolving or a redirect is in flight — render a gate. */
  isResolving: boolean;
}

/**
 * Protect a client page: bounce guests to `/login?next=<here>` and, when
 * `role` is set, bounce authenticated users who lack it. Returns `isResolving`
 * so the page can show an {@link "@/components/auth/auth-gate".AuthGate} until
 * access is confirmed instead of flashing protected content.
 */
export function useRequireAuth(options: RequireAuthOptions = {}): RequireAuthResult {
  const { role, deniedTo = "/" } = options;
  const { status, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const roles = role ? (Array.isArray(role) ? role : [role]) : null;
  const roleDenied = Boolean(roles && user && !roles.includes(user.role));

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (roleDenied) router.replace(deniedTo);
  }, [status, roleDenied, deniedTo, pathname, router]);

  return {
    status,
    isResolving: status !== "authenticated" || roleDenied,
  };
}
