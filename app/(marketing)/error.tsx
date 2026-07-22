"use client";

import { useEffect } from "react";
import { Container } from "@/components/ui/container";
import { ErrorState } from "@/components/shared/error-state";

/** Marketing route error boundary — recoverable via `unstable_retry`. */
export default function MarketingError({
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
    <Container className="py-10">
      <ErrorState onRetry={unstable_retry} homeHref="/" />
    </Container>
  );
}
