"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { setAuthTokenProvider } from "../data/http-client";
import type { CurrentUser, MerchantStaffRoleId, RoleId } from "../rbac/types";
import {
  endImpersonation as endImpersonationSession,
  startImpersonation as startImpersonationSession,
  type ImpersonationOrigin,
  type ImpersonationTarget,
} from "./impersonation";
import {
  clearSessionCookie,
  readSessionCookie,
  writeSessionCookie,
} from "./session-cookie";
import type { AuthStatus, Session } from "./types";

interface SessionValue {
  user: CurrentUser;
  status: AuthStatus;
  /** The operator behind an impersonated session; `null` when not impersonating. */
  impersonator: ImpersonationOrigin | null;
  /** Sign out: clears the client session + cookie, then returns to sign-in. */
  signOut: () => void;
  /**
   * Start viewing the dashboard as another user. Throws
   * {@link import("./impersonation").ImpersonationError} when refused; reloads
   * on success so every Server Component re-resolves as the target.
   */
  startImpersonation: (target: ImpersonationTarget, reason?: string) => void;
  /** Leave an impersonated session and restore the operator. */
  endImpersonation: () => void;
  /**
   * Prototype-only role switch ("view as"). Rewrites the session cookie and
   * reloads so the server re-resolves the principal — exactly the path a real
   * impersonation feature would take, minus the backend token exchange.
   */
  viewAsRole: (
    role: RoleId,
    options?: {
      merchantId?: string;
      merchantRole?: MerchantStaffRoleId;
      organizationId?: string;
    },
  ) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

/** localStorage key owned by the public auth service — cleared on sign-out. */
const PUBLIC_SESSION_KEY = "otithee:session";

/**
 * Exposes the server-resolved {@link Session} to client components and teaches
 * the HTTP client how to obtain the bearer token — so credentials live with the
 * session, not inside the transport. Injected once by the dashboard shell.
 */
export function SessionProvider({
  session,
  children,
}: {
  session: Session;
  children: ReactNode;
}) {
  // Keep the transport's token source in sync with the session.
  useEffect(() => {
    setAuthTokenProvider(() => session.token);
  }, [session.token]);

  const signOut = useCallback(() => {
    clearSessionCookie();
    try {
      window.localStorage.removeItem(PUBLIC_SESSION_KEY);
      window.dispatchEvent(new Event("otithee:session-change"));
    } catch {
      /* storage unavailable — the cookie is already gone */
    }
    // Full navigation so every Server Component re-resolves without a session.
    window.location.href = "/login";
  }, []);

  const viewAsRole = useCallback<SessionValue["viewAsRole"]>((role, options) => {
    const current = readSessionCookie();
    writeSessionCookie({
      id: current?.id ?? "usr_demo",
      name: current?.name ?? "Demo user",
      email: current?.email ?? "demo@otithee.com",
      accountRole: current?.accountRole,
      role,
      merchantId: options?.merchantId,
      merchantRole: options?.merchantRole,
      organizationId: options?.organizationId,
    });
    window.location.reload();
  }, []);

  const startImpersonation = useCallback<SessionValue["startImpersonation"]>(
    (target, reason) => {
      startImpersonationSession(session.user, target, { reason });
      // Full navigation to the dashboard root: the target's role may not have
      // access to whatever page the operator was on.
      window.location.href = "/dashboard";
    },
    [session.user],
  );

  const endImpersonation = useCallback(() => {
    endImpersonationSession();
    window.location.href = "/dashboard";
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      user: session.user,
      status: session.status,
      impersonator: session.impersonator ?? null,
      signOut,
      startImpersonation,
      endImpersonation,
      viewAsRole,
    }),
    [
      session.user,
      session.status,
      session.impersonator,
      signOut,
      startImpersonation,
      endImpersonation,
      viewAsRole,
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

/** Access the current session. Throws outside {@link SessionProvider}. */
export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within a <SessionProvider>.");
  }
  return ctx;
}
