/**
 * Normalized error model for the whole data layer.
 *
 * Transports (HTTP, stubs), repositories and services all throw {@link ApiError}
 * so UI code never has to reason about raw `Response` objects, `fetch` rejections
 * or driver-specific shapes. Each error carries a stable {@link ApiErrorKind} that
 * maps 1:1 to the states the design brief requires (401/403/404/409/500, network,
 * timeout, validation). `getErrorMessage` turns a kind into a generic, non-business
 * user-facing string — real copy comes from i18n later.
 */

export type ApiErrorKind =
  | "network" // request never reached the server
  | "timeout" // aborted after `timeoutMs`
  | "unauthorized" // 401 — not authenticated
  | "forbidden" // 403 — authenticated but not permitted
  | "not-found" // 404
  | "conflict" // 409
  | "validation" // 422 / field-level validation failure
  | "server" // 5xx
  | "unknown"; // anything else

/** Field-level validation issues keyed by form path (e.g. `email`). */
export type FieldErrors = Record<string, string[]>;

export interface ApiErrorOptions {
  kind: ApiErrorKind;
  message?: string;
  /** Originating HTTP status, when there was a response. */
  status?: number;
  /** Field errors for `kind: "validation"`. */
  fieldErrors?: FieldErrors;
  /** Raw payload/cause for logging — never rendered. */
  cause?: unknown;
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly fieldErrors?: FieldErrors;

  constructor({ kind, message, status, fieldErrors, cause }: ApiErrorOptions) {
    super(message ?? kind, { cause });
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  /** True when the failure is transient and a retry may succeed. */
  get isRetryable(): boolean {
    return (
      this.kind === "network" ||
      this.kind === "timeout" ||
      this.kind === "server"
    );
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

/** Map an HTTP status code to the corresponding error kind. */
export function statusToKind(status: number): ApiErrorKind {
  switch (status) {
    case 401:
      return "unauthorized";
    case 403:
      return "forbidden";
    case 404:
      return "not-found";
    case 409:
      return "conflict";
    case 422:
      return "validation";
    default:
      if (status >= 500) return "server";
      return "unknown";
  }
}

/**
 * Coerce any thrown value into an {@link ApiError}. `AbortError` becomes a
 * timeout; `TypeError` from `fetch` becomes a network error; existing
 * `ApiError`s pass through unchanged.
 */
export function toApiError(value: unknown): ApiError {
  if (isApiError(value)) return value;

  if (value instanceof DOMException && value.name === "AbortError") {
    return new ApiError({ kind: "timeout", message: "The request timed out." });
  }
  if (value instanceof TypeError) {
    return new ApiError({
      kind: "network",
      message: "Unable to reach the server.",
      cause: value,
    });
  }
  return new ApiError({
    kind: "unknown",
    message: value instanceof Error ? value.message : "Something went wrong.",
    cause: value,
  });
}

/** Default, generic, non-business message for a normalized error. */
export function getErrorMessage(error: unknown): string {
  const err = toApiError(error);
  switch (err.kind) {
    case "network":
      return "Can’t connect. Check your network and try again.";
    case "timeout":
      return "The request took too long. Please try again.";
    case "unauthorized":
      return "Your session has expired. Please sign in again.";
    case "forbidden":
      return "You don’t have permission to do that.";
    case "not-found":
      return "We couldn’t find what you were looking for.";
    case "conflict":
      return "This item was changed elsewhere. Refresh and try again.";
    case "validation":
      return "Please review the highlighted fields.";
    case "server":
      return "Something went wrong on our side. Please try again.";
    default:
      return err.message || "Something went wrong.";
  }
}
