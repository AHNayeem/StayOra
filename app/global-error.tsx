"use client";

import { useEffect } from "react";
import "./globals.css";

/**
 * Global error boundary — the last-resort 500 page. Replaces the root layout
 * when the root itself throws, so it must render its own `<html>`/`<body>` and
 * cannot rely on the marketing chrome. Kept dependency-light on purpose.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col items-center justify-center bg-surface px-6 py-16 text-center text-ink antialiased">
        <title>Something went wrong</title>
        <div className="mx-auto flex max-w-md flex-col items-center">
          <span className="grid size-16 place-items-center rounded-full bg-danger/10 text-3xl">
            ⚠️
          </span>
          <h1 className="mt-6 text-2xl font-bold text-ink">Something went wrong</h1>
          <p className="mt-2 text-body">
            An unexpected error occurred on our end. Please try again in a moment.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => unstable_retry()}
              className="rounded-pill bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/";
              }}
              className="rounded-pill border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary"
            >
              Go home
            </button>
          </div>
          {error.digest && (
            <p className="mt-6 text-xs text-muted">Error ref: {error.digest}</p>
          )}
        </div>
      </body>
    </html>
  );
}
