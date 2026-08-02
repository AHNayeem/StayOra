"use client";

import Link from "next/link";
import { PlaneTakeoff, RotateCcw } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button, buttonVariants } from "@/components/ui/button";

/**
 * Error boundary for every `/flights/*` route.
 *
 * Flight searches fail in ways stays don't — a fare source times out, an offer
 * expires mid-navigation — so retry is the primary action here, not a link home.
 * `reset()` re-runs the failed render, which for a search means re-quoting.
 */
export default function FlightsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex-1">
      <Container className="py-16 md:py-24">
        <div className="mx-auto max-w-lg text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-danger/10 text-danger">
            <PlaneTakeoff className="size-8" aria-hidden="true" />
          </div>
          <h1 className="mt-5 text-h3 text-ink">We couldn&apos;t load these fares</h1>
          <p className="mt-2 text-body">
            The airline connection didn&apos;t respond in time. Fares change constantly,
            so trying again usually works.
          </p>

          {error.digest && (
            <p className="mt-4 font-mono text-xs text-muted">
              Reference: {error.digest}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button
              variant="primary"
              size="md"
              onClick={reset}
              leftIcon={<RotateCcw className="size-4" aria-hidden="true" />}
            >
              Try again
            </Button>
            <Link
              href="/flights"
              className={buttonVariants({ variant: "outline", size: "md" })}
            >
              New search
            </Link>
            <Link
              href="/contact-us"
              className={buttonVariants({ variant: "ghost", size: "md" })}
            >
              Contact support
            </Link>
          </div>
        </div>
      </Container>
    </main>
  );
}
