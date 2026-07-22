/**
 * HTTP transport — the single place the dashboard talks to a backend over the
 * wire. Responsibilities:
 *
 * - build request URLs from the env-driven {@link getApiConfig} base
 * - inject the auth token from a pluggable provider (registered by the auth
 *   module, so this file has no dependency on session internals)
 * - enforce a per-request timeout via `AbortController`
 * - normalize every failure into an {@link ApiError}
 * - optionally validate the response against a schema (any object exposing
 *   `parse`, which every Zod schema satisfies) so bad payloads surface as
 *   `validation` errors instead of corrupting the UI
 *
 * No UI component imports this directly — repositories and services do.
 */
import { getApiConfig } from "./config";
import { ApiError, statusToKind, toApiError, type FieldErrors } from "./errors";

/** Minimal validator contract; a Zod schema satisfies this structurally. */
export interface OutputValidator<T> {
  parse: (data: unknown) => T;
}

type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions<T> {
  /** JSON-serializable request body. */
  body?: unknown;
  /** Query-string parameters; nullish values are dropped. */
  params?: Record<string, QueryValue>;
  /** Extra headers merged over the defaults. */
  headers?: Record<string, string>;
  /** Validate/parse the response payload (e.g. a Zod schema). */
  schema?: OutputValidator<T>;
  /** Caller-supplied abort signal, combined with the timeout. */
  signal?: AbortSignal;
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** Pluggable async token source; defaults to anonymous. */
type TokenProvider = () => string | null | Promise<string | null>;
let getAuthToken: TokenProvider = () => null;

/**
 * Register how the client obtains the bearer token. The auth module calls this
 * once at startup, keeping credentials out of the transport itself.
 */
export function setAuthTokenProvider(provider: TokenProvider): void {
  getAuthToken = provider;
}

function buildQueryString(params?: Record<string, QueryValue>): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

async function parseFieldErrors(response: Response): Promise<FieldErrors | undefined> {
  try {
    const data = (await response.clone().json()) as {
      errors?: FieldErrors;
      fieldErrors?: FieldErrors;
    };
    return data.fieldErrors ?? data.errors;
  } catch {
    return undefined;
  }
}

async function request<T>(
  method: Method,
  path: string,
  options: RequestOptions<T> = {},
): Promise<T> {
  const config = getApiConfig();
  if (!config.isLive) {
    // Guardrail: without a configured backend, callers must use the stub
    // services rather than hit the network. This throws loudly in dev.
    throw new ApiError({
      kind: "network",
      message:
        "No API base URL configured — use a stub service or set NEXT_PUBLIC_API_BASE_URL.",
    });
  }

  const url = `${config.baseUrl}${path}${buildQueryString(options.params)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  // Abort if either the timeout fires or the caller cancels.
  if (options.signal) {
    options.signal.addEventListener("abort", () => controller.abort(), {
      once: true,
    });
  }

  try {
    const token = await getAuthToken();
    const hasBody = options.body !== undefined;
    const response = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      body: hasBody ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      throw new ApiError({
        kind: statusToKind(response.status),
        status: response.status,
        message: response.statusText || undefined,
        fieldErrors:
          response.status === 422
            ? await parseFieldErrors(response)
            : undefined,
      });
    }

    // 204 / empty body → resolve as undefined (typed as T by the caller).
    if (response.status === 204) return undefined as T;
    const raw = (await response.json()) as unknown;

    if (options.schema) {
      try {
        return options.schema.parse(raw);
      } catch (cause) {
        throw new ApiError({
          kind: "validation",
          message: "The server returned an unexpected response.",
          cause,
        });
      }
    }
    return raw as T;
  } catch (error) {
    throw toApiError(error);
  } finally {
    clearTimeout(timeout);
  }
}

/** Typed HTTP client. Methods mirror REST verbs and share {@link RequestOptions}. */
export const httpClient = {
  get: <T>(path: string, options?: RequestOptions<T>) =>
    request<T>("GET", path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions<T>) =>
    request<T>("POST", path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions<T>) =>
    request<T>("PUT", path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions<T>) =>
    request<T>("PATCH", path, { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions<T>) =>
    request<T>("DELETE", path, options),
};

export type HttpClient = typeof httpClient;
