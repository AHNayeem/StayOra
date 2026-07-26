import type { AuditLog, LogStatus } from "./types";

const ACTORS = [
  "AH Nayeem", "Marcus Bell", "Elena Petrova", "Sam Okafor", "System",
  "Nina Kowalski", "Theo Martin", "API client",
];
const EVENTS: [string, string, string][] = [
  ["Updated booking", "bookings", "BK-1042"],
  ["Approved merchant", "merchants", "MRC-208"],
  ["Signed in", "auth", "session"],
  ["Deleted promotion", "promotions", "PRM-51"],
  ["Exported report", "reports", "revenue-12m"],
  ["Created user", "users", "usr_411"],
  ["Refund processed", "finance", "RFD-3300"],
  ["Updated settings", "settings", "general"],
  ["Published hotel", "catalog", "htl_305"],
  ["Failed sign-in", "auth", "session"],
];
const STATUSES: LogStatus[] = ["success", "success", "success", "success", "failure"];

function iso(minuteOffset: number): string {
  return new Date(Date.UTC(2026, 6, 20, 9, 0) + minuteOffset * 60_000).toISOString();
}

export const LOGS_SEED: AuditLog[] = Array.from({ length: 24 }, (_, i) => {
  const [action, resource, target] = EVENTS[i % EVENTS.length];
  const isFailedLogin = action === "Failed sign-in";
  return {
    id: `log_${9000 + i}`,
    actor: ACTORS[i % ACTORS.length],
    action,
    resource,
    target,
    ip: `${10 + (i % 90)}.${(i * 7) % 255}.${(i * 3) % 255}.${(i * 5) % 255}`,
    status: isFailedLogin ? "failure" : STATUSES[i % STATUSES.length],
    createdAt: iso(-(i * 37)),
  };
});
