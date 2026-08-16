"use client";

import { useSyncExternalStore } from "react";
import { Wrench } from "lucide-react";
import { DASHBOARD_SESSION_COOKIE, decodeSessionCookie } from "../auth/session-cookie";
import { useMaintenance } from "./use-platform-config";

/** Does this browser carry a valid dashboard session? */
function hasStaffSession(): boolean {
  if (typeof document === "undefined") return false;
  const raw = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${DASHBOARD_SESSION_COOKIE}=`))
    ?.split("=")[1];
  return Boolean(decodeSessionCookie(raw));
}

/** The cookie can only change on a full navigation, so there is nothing to subscribe to. */
const noSubscription = () => () => {};

/**
 * The thing that makes maintenance mode real.
 *
 * The toggle in System → Maintenance used to change a switch nothing enforced.
 * This gate wraps the public site: when maintenance is on, visitors get the
 * maintenance screen instead of the storefront, while signed-in staff keep
 * browsing (so an operator can verify a fix before going back live).
 *
 * It is a client gate because the configuration is client-persisted in the
 * prototype. With a real backend the same decision moves into middleware and
 * this component becomes the fallback rather than the enforcement point — the
 * copy and the staff bypass stay exactly as they are.
 */
export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const maintenance = useMaintenance();
  const isStaff = useSyncExternalStore(noSubscription, hasStaffSession, () => false);

  if (!maintenance.enabled || isStaff) return <>{children}</>;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-primary-50 text-primary">
        <Wrench className="size-8" aria-hidden="true" />
      </span>
      <div className="max-w-md">
        <h1 className="text-h3 text-ink">We&apos;ll be right back</h1>
        <p className="mt-2 text-body">{maintenance.message}</p>
        {maintenance.endsAt && (
          <p className="mt-3 text-sm text-muted">
            Expected back at{" "}
            {new Date(maintenance.endsAt).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
            .
          </p>
        )}
      </div>
      <p className="text-sm text-muted">
        Your bookings and account are safe. Thanks for your patience.
      </p>
    </main>
  );
}
