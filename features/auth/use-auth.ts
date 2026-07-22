"use client";

import { useMemo } from "react";
import type {
  AuthSession,
  AuthUser,
  LoginPayload,
  RegisterPayload,
} from "@/types/account";
import * as authService from "@/services/auth";
import { useHydrated } from "@/hooks/use-hydrated";
import { useSessionSnapshot, syncSession } from "./session-store";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface UseAuthResult {
  /** The signed-in user, or `null`. */
  user: AuthUser | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  /** False during SSR / first paint, before the persisted session is read. */
  isHydrated: boolean;
  /** True when the user may enter the merchant/admin dashboard. */
  canAccessDashboard: boolean;
  login: (payload: LoginPayload) => Promise<AuthSession>;
  register: (payload: RegisterPayload) => Promise<AuthSession>;
  logout: () => Promise<void>;
  updateProfile: (patch: Partial<AuthUser>) => Promise<AuthSession>;
  verifyEmail: () => Promise<AuthSession>;
}

/**
 * The single hook every client component uses to read and mutate the session.
 * Reads reactively from the session store and wraps the {@link authService}
 * operations so callers just `await` them (and handle their own toasts). No
 * provider required — the store is a module singleton.
 */
export function useAuth(): UseAuthResult {
  const session = useSessionSnapshot();
  const isHydrated = useHydrated();
  const user = session?.user ?? null;

  const status: AuthStatus = !isHydrated
    ? "loading"
    : user
      ? "authenticated"
      : "unauthenticated";

  return useMemo<UseAuthResult>(
    () => ({
      user,
      status,
      isAuthenticated: Boolean(user),
      isHydrated,
      canAccessDashboard: user?.role === "merchant" || user?.role === "admin",
      login: async (payload) => {
        const next = await authService.login(payload);
        syncSession(next);
        return next;
      },
      register: async (payload) => {
        const next = await authService.register(payload);
        syncSession(next);
        return next;
      },
      logout: async () => {
        await authService.logout();
        syncSession(null);
      },
      updateProfile: async (patch) => {
        if (!user) throw new authService.AuthError("Not signed in.");
        const next = await authService.updateProfile(user, patch);
        syncSession(next);
        return next;
      },
      verifyEmail: async () => {
        if (!user) throw new authService.AuthError("Not signed in.");
        const next = await authService.verifyEmail(user);
        syncSession(next);
        return next;
      },
    }),
    [user, status, isHydrated],
  );
}
