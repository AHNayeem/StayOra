/** Auth barrel — session resolution (server) and access (client). */
export {
  getServerSession,
  getCurrentUser,
  requirePermission,
  requireAnyPermission,
} from "./session";
export { SessionProvider, useSession } from "./session-provider";
export type { Session, AuthStatus } from "./types";
export {
  startImpersonation,
  endImpersonation,
  isImpersonating,
  currentImpersonation,
  ImpersonationError,
} from "./impersonation";
export type { ImpersonationOrigin, ImpersonationTarget } from "./impersonation";
export { ImpersonationBanner } from "./impersonation-banner";
export { ImpersonationDialog } from "./impersonation-dialog";
