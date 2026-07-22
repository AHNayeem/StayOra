"use client";

import { useEffect } from "react";
import { CreditCard } from "lucide-react";
import { Container } from "@/components/ui/container";
import { ErrorState } from "@/components/shared/error-state";

/** Checkout error boundary — a payment/booking step failed unexpectedly. */
export default function CheckoutError({
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
      <ErrorState
        icon={CreditCard}
        title="We couldn't complete checkout"
        description="Your card was not charged. Please try again — your selection is safe."
        onRetry={unstable_retry}
        homeHref="/"
      />
    </Container>
  );
}
