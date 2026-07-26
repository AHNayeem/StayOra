import type { ApiLog, HttpMethod } from "./types";
import { statusClassOf } from "./types";

/** Fixed epoch so the ledger is deterministic across reloads. */
export const API_EPOCH = Date.UTC(2026, 6, 20, 9, 0);

function iso(secondOffset: number): string {
  return new Date(API_EPOCH - secondOffset * 1000).toISOString();
}

type Route = [method: HttpMethod, endpoint: string];

const ROUTES: Route[] = [
  ["GET", "/api/v1/bookings"],
  ["POST", "/api/v1/bookings"],
  ["GET", "/api/v1/properties/:id"],
  ["GET", "/api/v1/search"],
  ["POST", "/api/v1/payments/charge"],
  ["POST", "/api/v1/auth/login"],
  ["PATCH", "/api/v1/bookings/:id"],
  ["DELETE", "/api/v1/bookings/:id"],
  ["GET", "/api/v1/merchants/:id/payouts"],
  ["PUT", "/api/v1/properties/:id"],
  ["GET", "/api/v1/reviews"],
  ["POST", "/api/v1/webhooks/stripe"],
];
const CLIENTS = ["web-app", "ios-app", "android-app", "partner-api", "internal-cron"];
// Most calls succeed; a few 4xx and the odd 5xx keep the error KPIs meaningful.
const CODES = [200, 200, 200, 201, 200, 204, 200, 400, 200, 404, 200, 500, 422, 200];

export const API_LOGS_SEED: ApiLog[] = Array.from({ length: 36 }, (_, i) => {
  const [method, endpoint] = ROUTES[i % ROUTES.length];
  const statusCode = CODES[i % CODES.length];
  const base = method === "GET" ? 40 : 90;
  return {
    id: `api_${5000 + i}`,
    method,
    endpoint,
    statusCode,
    statusClass: statusClassOf(statusCode),
    latencyMs: base + ((i * 37) % 260),
    client: CLIENTS[i % CLIENTS.length],
    ip: `${30 + (i % 60)}.${(i * 9) % 255}.${(i * 4) % 255}.${(i * 7) % 255}`,
    createdAt: iso(i * 17),
  };
});
