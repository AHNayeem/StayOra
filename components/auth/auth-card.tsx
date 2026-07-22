import type { ReactNode } from "react";

/**
 * AuthCard — the shared heading block for every auth form: an eyebrow-free
 * title and supporting copy above the form body. The surrounding panel/spacing
 * is provided by the (auth) layout, so this stays purely about the content.
 */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  /** Optional bottom row (e.g. "Already have an account? Sign in"). */
  footer?: ReactNode;
}) {
  return (
    <div className="w-full">
      <h1 className="text-h2 text-ink">{title}</h1>
      {subtitle && <p className="mt-2 text-sm text-body">{subtitle}</p>}
      <div className="mt-7">{children}</div>
      {footer && (
        <p className="mt-6 text-center text-sm text-body">{footer}</p>
      )}
    </div>
  );
}
