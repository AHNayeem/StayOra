/**
 * toast — the single feedback entry point for the whole app.
 *
 * Wraps Sonner so components never import the library directly: defaults,
 * durations and a few domain shortcuts (`copied`, `saved`, `promise`) live in
 * one place, and swapping the toast implementation later touches only this file.
 * Render the host once via {@link "@/components/ui/toaster".Toaster}.
 */
import { toast as sonner, type ExternalToast } from "sonner";

const DEFAULTS: ExternalToast = { duration: 4000 };

export const toast = {
  success: (message: string, opts?: ExternalToast) =>
    sonner.success(message, { ...DEFAULTS, ...opts }),
  error: (message: string, opts?: ExternalToast) =>
    sonner.error(message, { ...DEFAULTS, duration: 6000, ...opts }),
  info: (message: string, opts?: ExternalToast) =>
    sonner.info(message, { ...DEFAULTS, ...opts }),
  warning: (message: string, opts?: ExternalToast) =>
    sonner.warning(message, { ...DEFAULTS, ...opts }),
  loading: (message: string, opts?: ExternalToast) =>
    sonner.loading(message, opts),
  message: (message: string, opts?: ExternalToast) =>
    sonner(message, { ...DEFAULTS, ...opts }),
  dismiss: (id?: string | number) => sonner.dismiss(id),

  /** "Copied to clipboard" confirmation — used by coupon codes, share links. */
  copied: (label = "Copied to clipboard") =>
    sonner.success(label, { ...DEFAULTS, duration: 2000 }),

  /** "<Thing> saved" confirmation for forms and settings. */
  saved: (thing = "Changes") =>
    sonner.success(`${thing} saved`, { ...DEFAULTS }),

  /**
   * Drive a toast through the lifecycle of an async action. Resolves the same
   * promise so callers can still await the underlying work.
   */
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    },
  ) => sonner.promise(promise, messages),
};

export type { ExternalToast };
