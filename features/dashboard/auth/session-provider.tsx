"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { setAuthTokenProvider } from "../data/http-client";
import type { CurrentUser } from "../rbac/types";
import type { AuthStatus, Session } from "./types";

interface SessionValue {
  user: CurrentUser;
  status: AuthStatus;
  /** Begin sign-out. Stub today; wire to `POST /auth/logout` + redirect later. */
  signOut: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

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

  const value = useMemo<SessionValue>(
    () => ({
      user: session.user,
      status: session.status,
      signOut: () => {
        // Phase 3 stub — no auth backend yet. Later: revoke the token then
        // redirect to the sign-in route.
      },
    }),
    [session.user, session.status],
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
