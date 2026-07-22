"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/error-state";

/** Account section error boundary — nested inside the account shell. */
export default function AccountError({
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
    <ErrorState
      title="We couldn't load this page"
      description="Something went wrong loading your account data. Please try again."
      onRetry={unstable_retry}
      homeHref="/account"
    />
  );
}
