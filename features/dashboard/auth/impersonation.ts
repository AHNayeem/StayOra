/**
 * Impersonation — "view the dashboard as this user".
 *
 * `impersonate` has been in the permission catalogue since the start with
 * nothing behind it. This is the prototype implementation of the flow support
 * and admin teams need: pick a user, confirm with a reason, work as them, and
 * leave a trail.
 *
 * **What this is not:** security. The session cookie is readable prototype
 * state, so this grants nothing a user couldn't already write by hand — it is
 * the *workflow*, modelled end to end, not an enforcement boundary. A real
 * implementation exchanges a token server-side and issues a scoped session
 * carrying both identities; the shapes here (`ImpersonationOrigin` on the
 * session, an audit entry on start and end) are already that contract, so the
 * UI does not change when the server takes over.
 */

import { recordAudit } from "../domain/service-kit";
import { userCan } from "../rbac/authorize";
import type { CurrentUser, MerchantStaffRoleId, RoleId } from "../rbac/types";
import { getRole } from "../rbac/roles";
import {
  readSessionCookie,
  writeSessionCookie,
  type SessionCookiePayload,
} from "./session-cookie";

/** Who to become. */
export interface ImpersonationTarget {
  id: string;
  name: string;
  email: string;
  roleId: RoleId;
  merchantId?: string;
  merchantRole?: MerchantStaffRoleId;
  organizationId?: string;
  /** Coarse account role, so post-impersonation routing still works. */
  accountRole?: string;
  /** What kind of principal this is — display only. */
  kind?: "user" | "merchant" | "agency";
  /** Extra context for the banner and the audit entry, e.g. a merchant name. */
  label?: string;
}

/**
 * The operator behind an impersonated session: enough of the original principal
 * to restore it, plus when and why the session started.
 */
export interface ImpersonationOrigin {
  id: string;
  name: string;
  email: string;
  role: RoleId;
  accountRole?: string;
  merchantId?: string;
  organizationId?: string;
  startedAt: string;
  reason?: string;
  /** Display label of who is being impersonated. */
  targetLabel?: string;
}

export class ImpersonationError extends Error {}

/** True when the current session is an impersonated one. */
export function isImpersonating(): boolean {
  return Boolean(readSessionCookie()?.impersonator);
}

/** The operator behind the current session, if any. */
export function currentImpersonation(): ImpersonationOrigin | null {
  return readSessionCookie()?.impersonator ?? null;
}

function requireCookie(): SessionCookiePayload {
  const current = readSessionCookie();
  if (!current) {
    throw new ImpersonationError("Your session has expired. Sign in again.");
  }
  return current;
}

/**
 * Begin impersonating `target`.
 *
 * Refuses when the operator lacks `users:impersonate`, is already impersonating
 * (nesting hides who is really acting), or is targeting themselves. Writes the
 * session cookie with the target's identity and the operator's on the side, then
 * returns — the caller reloads so every Server Component re-resolves.
 */
export function startImpersonation(
  actor: CurrentUser,
  target: ImpersonationTarget,
  options: { reason?: string } = {},
): ImpersonationOrigin {
  if (!userCan(actor, "users:impersonate")) {
    throw new ImpersonationError(
      "You don't have permission to impersonate other users.",
    );
  }
  const current = requireCookie();
  if (current.impersonator) {
    throw new ImpersonationError(
      "You're already impersonating someone. Exit that session first.",
    );
  }
  if (target.id === actor.id) {
    throw new ImpersonationError("You're already signed in as this user.");
  }

  const origin: ImpersonationOrigin = {
    id: current.id,
    name: current.name,
    email: current.email,
    role: current.role,
    accountRole: current.accountRole,
    merchantId: current.merchantId,
    organizationId: current.organizationId,
    startedAt: new Date().toISOString(),
    reason: options.reason?.trim() || undefined,
    targetLabel: target.label ?? target.name,
  };

  writeSessionCookie({
    id: target.id,
    name: target.name,
    email: target.email,
    role: target.roleId,
    merchantId: target.merchantId,
    merchantRole: target.merchantRole,
    organizationId: target.organizationId,
    accountRole: target.accountRole ?? current.accountRole,
    impersonator: origin,
  });

  recordAudit({
    actor: { id: actor.id, name: actor.name, role: actor.roleId },
    action: "impersonate",
    entity: target.kind ?? "user",
    entityId: target.id,
    entityLabel: target.label ?? target.name,
    summary: options.reason?.trim()
      ? `Started impersonating ${target.name} — ${options.reason.trim()}`
      : `Started impersonating ${target.name}`,
    from: getRole(actor.roleId).label,
    to: getRole(target.roleId).label,
  });

  return origin;
}

/**
 * End the impersonated session and restore the operator.
 *
 * Deliberately requires no permission: whoever is currently in an impersonated
 * session must always be able to leave it, even though the *impersonated* role
 * usually can't impersonate anyone.
 */
export function endImpersonation(): ImpersonationOrigin {
  const current = requireCookie();
  const origin = current.impersonator;
  if (!origin) {
    throw new ImpersonationError("This session isn't an impersonated one.");
  }

  writeSessionCookie({
    id: origin.id,
    name: origin.name,
    email: origin.email,
    role: origin.role,
    merchantId: origin.merchantId,
    organizationId: origin.organizationId,
    accountRole: origin.accountRole,
  });

  const minutes = Math.max(
    1,
    Math.round((Date.now() - new Date(origin.startedAt).getTime()) / 60_000),
  );
  recordAudit({
    actor: { id: origin.id, name: origin.name, role: origin.role },
    action: "impersonation_end",
    entity: "user",
    entityId: current.id,
    entityLabel: origin.targetLabel ?? current.name,
    summary: `Ended impersonation of ${origin.targetLabel ?? current.name} after ~${minutes} min`,
    from: getRole(current.role).label,
    to: getRole(origin.role).label,
  });

  return origin;
}
