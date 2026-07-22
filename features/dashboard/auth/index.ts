/** Auth barrel — session resolution (server) and access (client). */
export {
  getServerSession,
  getCurrentUser,
  requirePermission,
  requireAnyPermission,
} from "./session";
export { SessionProvider, useSession } from "./session-provider";
export type { Session, AuthStatus } from "./types";
