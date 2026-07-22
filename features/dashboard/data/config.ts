/**
 * Data-layer configuration.
 *
 * Every transport setting is read from the environment, never hardcoded, so the
 * same build points at local, staging or production APIs without code changes.
 * When no base URL is configured the app runs entirely on the in-repo stub
 * services (Phase 3 has no backend yet) — see `services/*`.
 *
 * - `API_BASE_URL`             — server-only origin (never shipped to the client)
 * - `NEXT_PUBLIC_API_BASE_URL` — client-visible origin
 */
export interface ApiConfig {
  /** Absolute origin for API calls, or `""` when running on stubs. */
  baseUrl: string;
  /** Per-request timeout in milliseconds. */
  timeoutMs: number;
  /** True when a real backend origin is configured. */
  isLive: boolean;
}

const DEFAULT_TIMEOUT_MS = 15_000;

function readBaseUrl(): string {
  // Server env wins; fall back to the client-exposed variable. Both optional.
  const raw =
    process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  return raw.replace(/\/+$/, "");
}

function readTimeout(): number {
  const raw = process.env.NEXT_PUBLIC_API_TIMEOUT_MS;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

/** Resolve the effective API configuration for the current environment. */
export function getApiConfig(): ApiConfig {
  const baseUrl = readBaseUrl();
  return {
    baseUrl,
    timeoutMs: readTimeout(),
    isLive: baseUrl.length > 0,
  };
}
